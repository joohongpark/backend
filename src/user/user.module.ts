import { Module } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import MockUserProfileRepository from './mock.user-profile.repository';
import { UserProfileService } from './user-profile.service';
import { UserProfileRepository } from './user-profile.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRepository,
      UserProfileRepository,
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserProfileService,
  ],
  exports: [UserService],
})
export class UserModule {}
