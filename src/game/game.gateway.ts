import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SubscribeMessage, WebSocketGateway,
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketGuard } from 'src/guards/socket.guard';
import { SessionMiddleware } from 'src/session-middleware';
import {
  PaddleDirective, RenderData, GameData,
} from './dto/game-data';
import { GameSession } from './dto/game-session.dto';
import { GameSocket } from './dto/game-socket.dto';
import { ScoreData } from './dto/in-game.dto';
import { RuleDto } from './dto/rule.dto';
import { StatusDto } from './dto/status.dto';
import { GameSocketSession } from './game-socket-session';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '',
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('GameGateway');

  @WebSocketServer() private readonly server: Server;

  constructor(
    private readonly socketSession: GameSocketSession,
    private readonly gameService: GameService,
    private readonly sessionMiddleware: SessionMiddleware,
  ) { }

  /**
   * Apply passport authentication.
   * socketSession will be deprecated.
   */
  afterInit(server: any) {
    this.logger.debug('Initialize');
    server.use((socket, next) => {
      this.socketSession.joinSession(socket, next);
    });
    const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
    server.use(wrap(this.sessionMiddleware.expressSession));
    server.use(wrap(this.sessionMiddleware.passportInit));
    server.use(wrap(this.sessionMiddleware.passportSession));
  }

  /**
   * 첫 접속시에 session에 저장되어 있던
   * userId와 RoomId(game)에 접속을 시켜준다.
   * @param client 서버에 접속하는 클라이언트
   */
  handleConnection(client: GameSocket) {
    this.logger.debug(`user ${client.session.userId} connected`);
    client.join(client.session.userId.toString());
    if (client.session.inGame) { // 게임중에 나갔을 경우 재접.
      client.join(client.session.roomId);
      this.server.to(client.session.roomId).emit('player:join', client.session.userId);
    }
  }

  /**
   * 유저아이디로 된 방에서 나갈경우에,
   * 게임중(세팅 + 플레이)이면 플레이어가 나갔다고 알린다.
   * @param client 클라이언트 접속을 끊었을 때
   */
  async handleDisconnect(client: any) {
    this.logger.debug(`user ${client.session.userId} disconnected`);
    const matchingSocket = await this.server.in(client.session.userId.toString()).allSockets();
    const isDisconnected = matchingSocket.size === 0;
    if (isDisconnected) {
      if (client.session.roomId !== null) {
        client.to(client.session.roomId).emit('player:leave', client.session.userId);
      }
    }
  }

  /** TODO(jinbekim): rename subscribeMessage
   */
  @UseGuards(SocketGuard)
  @SubscribeMessage('enQ')
  async handleEnqueue(client: GameSocket, ruleData: RuleDto) {
    this.logger.debug(`user ${client.session.userId} enqueued`);
    return this.gameService.handleEnqueue(client.session, ruleData);
  }

  @UseGuards(SocketGuard)
  @SubscribeMessage('deQ')
  handleDequeue(client: GameSocket, ruleData: RuleDto) {
    this.logger.debug(`user ${client.session.userId} request dequeued`);
    return this.gameService.handleDequeue(client.session, ruleData);
  }

  @OnEvent('game:match')
  handleMatch(data: GameSession[]) {
    this.logger.debug(`Matching ${data.length} users`);
    const players = [
      data[0].userId.toString(),
      data[1].userId.toString(),
    ];
    this.server.to(players).emit('game:match', {
      blue: players[0],
      red: players[1],
    });
    this.server.in(players).socketsJoin(data[0].roomId);
    // socket의 session data update를 해줌.
    this.socketSession.saveSession(data[0].sessionId, data[0]);
    this.socketSession.saveSession(data[1].sessionId, data[1]);
  }

  /**
   * 주어진 메타 데이터로 게임을 생성하고 게임을 시작한다.
   * @param data game의 metadata
   */
  @OnEvent('game:ready')
  handleGameReady(data: GameData) {
    const roomId = data?.metaData?.roomId;
    this.logger.debug(`game ${roomId} started`);
    if (roomId) {
      this.gameService.createGame(data.metaData.roomId);
      this.server.to(data.metaData.roomId).emit('game:ready', data);
      this.socketSession.saveSession(data.metaData.playerBlue.sessionId, {
        ...data.metaData.playerBlue,
        inGame: true,
      });
      this.socketSession.saveSession(data.metaData.playerRed.sessionId, {
        ...data.metaData.playerRed,
        inGame: true,
      });
    }
  }

  /**
   * 게임 시작전 ready 이벤트
   * @param roomId 방 아이디
   * @param data 게임 상태
   */
  @OnEvent('game:start')
  handleGamestart(roomId: string, data: StatusDto) {
    this.logger.debug(`game ${roomId} is ${data}`);
    this.server.to(roomId).emit('game:start', data);
  }

  /**
   * 자신의 패들의 움직임 방향을 바꾼다.
   * @param client 유저 소켓
   * @param data paddle의 움직임 방향
   */
  @UseGuards(SocketGuard)
  @SubscribeMessage('game:paddle')
  handlePaddleControl(client: GameSocket, data: { direction: PaddleDirective }) {
    this.logger.debug(`user ${client.session.userId} moved paddle ${data}`);
    this.gameService.handlePaddle(client.session.roomId, client.session.userId, data.direction);
  }

  /**
   * 데이터를 랜더한다.
   * @param roomId 게임의 roomId
   * @param data RenderData
   */
  @OnEvent('game:render')
  handleGameData(roomId: string, data: RenderData) {
    this.server.to(roomId).emit('game:render', data);
  }

  /**
   * 득점시에 보내는 데이터.
   * @param roomId 게임의 roomId
   * @param data ScoreData
   */
  @OnEvent('game:score')
  handleGaemtScore(roomId: string, data: ScoreData) {
    this.server.to(roomId).emit('game:score', data);
  }

  /**
   * 게임이 종료되었음을 클라이언트에 알린다.
   * @param roomId 게임의 roomId
   */
  @OnEvent('game:end')
  handleGameEnd(roomId: string, data: GameData) {
    const { metaData } = data;
    this.gameService.endGame(roomId);
    this.socketSession.saveSession(metaData.playerBlue.sessionId, {
      ...metaData.playerBlue,
      roomId: null,
      inGame: false,
    });
    this.socketSession.saveSession(metaData.playerRed.sessionId, {
      ...metaData.playerRed,
      roomId: null,
      inGame: false,
    });
    this.server.to(roomId).emit('game:end', data);
    this.server.in(roomId).socketsLeave(roomId);
  }
}
