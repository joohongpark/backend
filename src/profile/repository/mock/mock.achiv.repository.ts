import { AchivDto } from 'src/profile/dto/achiv.dto';

export default class MockAchivRepository {
  MockEntity: any[] = [];

  constructor() {
    this.MockEntity.push({
      achivSeq: 1,
      achivTitle: 'Score50',
      imgUri: './achiv1.jpg',
      totalScore: 50,
    });
    this.MockEntity.push({
      achivSeq: 2,
      achivTitle: 'Score100',
      imgUri: './achiv2.jpg',
      totalScore: 100,
    });
    this.MockEntity.push({
      achivSeq: 3,
      achivTitle: 'Score150',
      imgUri: './achiv3.jpg',
      totalScore: 150,
    });
  }

  async getAchiv() : Promise<AchivDto[] | undefined> {
    if (this.MockEntity.length === 0) {
      return undefined;
    }
    return this.MockEntity;
  }
}
