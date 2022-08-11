import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer, WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SessionMiddleware } from 'src/session-middleware';
import { FriendsService } from './friends.service';

@WebSocketGateway({ namespace: 'friends' })
export class FriendsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(FriendsGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(
    private sessionMiddleware: SessionMiddleware,
    private frinedsService: FriendsService,
  ) {}

  /**
   * 소켓에도 세션을 적용하기 위한 미들웨어 적용
   *
   * @param server 소켓 서버측 객체
   */
  afterInit(server: any) {
    const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
    server.use(wrap(this.sessionMiddleware.expressSession));
    server.use(wrap(this.sessionMiddleware.passportInit));
    server.use(wrap(this.sessionMiddleware.passportSession));
  }

  async handleConnection(client: any) {
    const isLogin = client.request.isAuthenticated();
    if (!isLogin) {
      client.disconnect();
      return ;
    }
    const { userSeq } = client.request.user;
    await this.frinedsService.onlineUserAdd(client, userSeq);
  }

  async handleDisconnect(client: any) {
    const { userSeq } = client.request.user;
    await this.frinedsService.onlineUserRemove(client, userSeq);
  }

  @OnEvent('friends:update')
  async onFriendsUpdate(userSeq1: number, userSeq2: number) {
    this.logger.debug('frineds udpate');
    const target1 = await this.frinedsService.getOnlineClients(userSeq1);
    if (target1.length > 0) {
      this.server.to(target1).emit('friends:update');
    }

    const target2 = await this.frinedsService.getOnlineClients(userSeq2);
    if (target2.length > 0) {
      this.server.to(target2).emit('friends:update');
    }
  }
}
