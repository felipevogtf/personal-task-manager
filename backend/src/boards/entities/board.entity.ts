import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BoardIssue } from './board-issue.entity';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @OneToMany(() => BoardIssue, (bi) => bi.board, { cascade: true })
  board_issues: BoardIssue[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
