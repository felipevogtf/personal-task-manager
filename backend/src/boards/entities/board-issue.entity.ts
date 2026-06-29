import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Board } from './board.entity';
import { Issue } from '../../issues/entities/issue.entity';

@Entity('board_issues')
export class BoardIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Board, (board) => board.board_issues, { onDelete: 'CASCADE' })
  board: Board;

  @ManyToOne(() => Issue, (issue) => issue.board_issues, { onDelete: 'CASCADE' })
  issue: Issue;

  @Column({ default: 0 })
  position: number;

  @CreateDateColumn()
  created_at: Date;
}
