import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { ProfileModule } from 'src/profile/profile.module';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendsRepository } from './repository/friends.repository';
import { FriendsGateway } from './friends.gateway';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => ProfileModule),
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
  exports: [
    FriendsService,
  ],
})
export class FriendsModule {}
