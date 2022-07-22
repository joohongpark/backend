import { CacheModule, Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import ChatParticipantRepository from './repository/chat-participant.repository';
import ChatRepository from './repository/chat.repository';
import ChatroomsController from './chatrooms.controller';
import { ChatroomsGateway } from './chatrooms.gateway';
import ChatroomsService from './chatrooms.service';
import MessageRepository from './repository/message.repository';
import ChatEventRepository from './repository/chat-event.repository';
import FriendsRepository from './repository/friends.repository';
import { AppModule } from 'src/app.module';

@Module({
  imports: [
    forwardRef(() => AppModule),
    TypeOrmModule.forFeature([
      ChatRepository,
      ChatEventRepository,
      ChatParticipantRepository,
      FriendsRepository,
      MessageRepository,
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CacheModule.register({ ttl: 0 }),
  ],
  controllers: [
    ChatroomsController,
  ],
  providers: [
    ChatroomsGateway,
    ChatroomsService,
  ],
})
export class ChatroomsModule { }
