import ChatType from 'src/enums/chat-type.enum';
import {
  BaseEntity,
  Column, Entity, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
// eslint-disable-next-line import/no-cycle
import Message from './Message.entity';

@Entity()
export default class Chat extends BaseEntity {
  @PrimaryGeneratedColumn()
    chatSeq: number;

  @Column({ nullable: false, default: ChatType.PUBLIC })
    chatType: ChatType;

  @Column({ nullable: false, unique: true })
    chatName: string;

  @Column({ nullable: true })
    password: string;

  @Column({ nullable: false, default: false })
    isDirected: boolean;

  @OneToMany(() => Message, (message) => message.chatSeq)
    msgSeq: number;
}
