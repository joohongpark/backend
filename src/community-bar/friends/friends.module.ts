import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { ProfileModule } from 'src/profile/profile.module';
import { AlarmModule } from 'src/alarm/alarm.module';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendsRepository } from './repository/friends.repository';
import { FriendsGateway } from './friends.gateway';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    AlarmModule,
    CacheModule.register({ ttl: 0 }),
    TypeOrmModule.forFeature([
      FriendsRepository,
    ]),
  ],
  controllers: [
    FriendsController,
  ],
  providers: [
    FriendsGateway,
    FriendsService,
  ],
})
export class FriendsModule {}
