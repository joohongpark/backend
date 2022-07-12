import {
  IsObject, IsString,
} from 'class-validator';
import GameType from 'src/enums/mastercode/game-type.enum';
import { GameSession } from './game-session.dto';

export class MetaData {
  constructor(
    roomId: string,
    playerTop: GameSession,
    playerBtm: GameSession,
    gameType: GameType,
  ) {
    this.roomId = roomId;
    this.playerTop = playerTop;
    this.playerBtm = playerBtm;
    this.gameType = gameType;
  }

  @IsString()
    roomId: string;

  @IsObject()
    playerTop: GameSession;

  @IsObject()
    playerBtm: GameSession;

  /**
     * gameType can be modified to isRankGame: boolean type
     */
  @IsString()
    gameType: GameType;
}
