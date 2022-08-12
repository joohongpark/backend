import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { UserDto } from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';
import { AlarmService } from 'src/alarm/alarm.service';
import {
  GameData, MetaData,
} from './dto/game-data';
import { InGameData, PaddleDirective } from './dto/in-game.dto';
import { SimulationService } from './simulation.service';
import { GameQueue } from './game-queue';
import { RuleDto } from './dto/rule.dto';
import { GameLogService } from './game-log.service';

@Injectable()
export class GameService {
  private readonly logger: Logger = new Logger('GameService');

  /** game list  */
  private games: Map<string, GameData> = new Map();

  /** To quickly get roomId which is participanted by the userSeq */
  private users: Map<number, string> = new Map();

  constructor(
    private eventRunner: EventEmitter2,
    private gameQueue: GameQueue,
    private simulator: SimulationService,
    private gamelogService: GameLogService,
    private readonly userService: UserService,
    private readonly alarmService: AlarmService,
  ) {}

  /** roomId를 통해 현재 이 방이 진행중 인지 확인한다. */
  checkPresenceOf(roomId: string): boolean {
    if (this.games.get(roomId)) return true;
    return false;
  }

  /** userSeq를 통해 현재 진행중인 게임을 찾는다. */
  findCurrentGame(userSeq: number): GameData | undefined {
    const roomId = this.users.get(userSeq);
    return this.games.get(roomId);
  }

  async handleEnqueue(client: UserDto, ruleData: RuleDto) {
    this.logger.debug(`user client: ${client.userId} and ruleData: ${ruleData}`);
    const matchedPlayers = await this.gameQueue.enQueue(client, ruleData);
    this.logger.debug('enqueue reusult', matchedPlayers);
    /** if not matched return */
    if (matchedPlayers === false) return;
    await this.createGame(matchedPlayers);
  }

  handleDequeue(client: UserDto, ruleData: RuleDto) {
    this.logger.debug('handleDequeue', ruleData);
    return this.gameQueue.deQueue(client, ruleData);
  }

  /**
   * 게임 초대를 수락한다.
   * 수락한 알람 시퀀스를 토대로 연관된 유저 두명을 불러와 게임을 생성한다.
   */
  async handleAcceptInvite(alarmSeq: number) {
    this.logger.debug('handle Invite');
    const alarm = await this.alarmService.getAlarmBySeq(alarmSeq);
    const bluePlayer = await this.userService.findByUserId(alarm.receiverSeq);
    const redPlayer = await this.userService.findByUserId(alarm.senderSeq);
    if (bluePlayer === undefined || redPlayer === undefined) { throw new NotFoundException('해당 유저가 존재하지 않습니다.'); }
    // TODO: user 접속중 확인하고 아니면 error 응답.

    await this.createGame([[bluePlayer, null], [redPlayer, null]]);
  }

  /**
   * 일반적인 큐 시스템을 이용해서 매칭 되었을 경우에 매치 후 방을 생성한다.
   */
  async createGame(matchedPlayers: [UserDto, RuleDto][]) {
    this.logger.debug('createGame(matchedPlayers): creating');

    /** after Matching players */
    const [[bluePlayer, blueRule], [redPlayer, redRule]] = [...matchedPlayers];
    const newGame = new GameData();
    const newRoomId = randomUUID();

    /** save in session, 저장 잘 안되면 인자로 userdto말고 세션 통째로 가져와야함.
     * session에 roomid 저장
    */
    bluePlayer.roomId = newRoomId;
    redPlayer.roomId = newRoomId;

    /** metaData */
    newGame.metaData = new MetaData(
      newRoomId,
      bluePlayer,
      redPlayer,
      blueRule.isRankGame,
    );

    /** temporarily apply bluePlayer's rule */
    newGame.ruleData = new RuleDto();
    if (blueRule && redRule) {
      newGame.ruleData.ballSpeed = blueRule.ballSpeed;
      newGame.ruleData.matchScore = blueRule.matchScore;
      newGame.ruleData.paddleSize = redRule.paddleSize;
    }

    /** inGameData */
    newGame.inGameData = new InGameData();
    this.games.set(newGame.metaData.roomId, newGame);
    this.users.set(bluePlayer.userSeq, newRoomId);
    this.users.set(redPlayer.userSeq, newRoomId);

    /** add gameData into simulator */
    await this.simulator.initBeforeStartGame(newGame);
    this.eventRunner.emit('game:ready', newGame);
  }

  /** for Testing */
  createTestGame(client: any) {
    this.logger.debug('createTestGame', client);
    this.simulator.initBeforeStartTestGame(client);
  }

  /** 게임을 종료 시킨다. */
  async endGame(roomId: string) {
    this.logger.debug(`ended games roomId: ${roomId}`);
    const { playerBlue, playerRed } = this.games.get(roomId).metaData;
    this.games.delete(roomId);
    this.users.delete(playerRed.userId);
    this.users.delete(playerBlue.userId);
    this.simulator.saveAfterEndGame(roomId);
  }

  /**
   * 자신의 패들 방향을 바꾼다.
   * @param roomId 방 아이디
   * @param userId 유저 아이디
   * @param cmd 패들 움직임 명령
   */
  handlePaddle(roomId: string, userId: number, cmd: PaddleDirective) {
    this.logger.debug(`handlePaddle called with roomId ${roomId} userId ${userId}, ${cmd}`);
    this.simulator.handlePaddle(roomId, userId, cmd);
  }

  /**
   * TESETESTSETSETSETSETSETSETSETSE
   * 자신의 패들 방향을 바꾼다.
   * @param roomId 방 아이디
   * @param userId 유저 아이디
   * @param cmd 패들 움직임 명령
   */
  handleTestPaddle(roomId: string, userId: string, cmd: number) {
    this.logger.debug(`handleTestPaddle(roomId: ${roomId}, userId: ${userId})`);
    this.simulator.handleTestPaddle(roomId, userId, cmd);
  }
}
