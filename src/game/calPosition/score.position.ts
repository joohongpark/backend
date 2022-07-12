import { GameData } from '../dto/game-data';

export const enum ScorePosition {
  blueWin = 'blueWin',
  redWin = 'redWin',
  playing = 'playing',
}
/**
 * 매 프레임 마다 공의 위치가 승리조건에 부합하는지 판단한다.
 * @param game game data
 * @returns win or lose
 */
export const checkScorePosition = (game: GameData) : ScorePosition => {
  const { inGameData, inGameData: { ball } } = game;

  // left(blue) lose
  if (ball.position.x - GameData.spec.ball.radius < ((GameData.spec.arena.width / 2) * -1)) {
    inGameData.scoreBlue += 1;
    return ScorePosition.blueWin;
  }
  // rigth(red) lose
  if (ball.position.x + GameData.spec.ball.radius > (GameData.spec.arena.width / 2)) {
    inGameData.scoreRed += 1;
    return ScorePosition.redWin;
  }
  return ScorePosition.playing;
};
