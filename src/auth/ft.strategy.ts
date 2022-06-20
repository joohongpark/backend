import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';
import { UserService } from 'src/user/user.service';

@Injectable()
export class FtStrategy extends PassportStrategy(Strategy, '42') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get('auth.clientid'),
      clientSecret: configService.get('auth.clientsecret'),
      callbackURL: '/api/auth/login/callback',
      passReqToCallback: true,
      profileFields: {
        userId: 'id',
        email: 'email',
        login: 'login',
      },
    });
  }

  async validate(req, at, rt, profile, cb) {
    await this.userService.createByUserId(
      profile.userId,
      profile.email,
      profile.login,
    );
    const result = await this.userService.findByOAuthId(profile.userId);
    cb(null, {
      seq: result,
    });
  }
}
