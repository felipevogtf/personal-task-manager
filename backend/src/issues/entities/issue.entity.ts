import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Label } from '../../labels/entities/label.entity';
import { State } from '../../states/entities/state.entity';
import { BoardIssue } from '../../boards/entities/board-issue.entity';

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plane_id: string;

  @ManyToOne(() => Project, (project) => project.issues, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  priority: string;

  @Column({ nullable: true })
  plane_state: string;

  @Column({ nullable: true })
  sequence_id: number;

  @ManyToOne(() => State, (state) => state.issues, { onDelete: 'SET NULL', nullable: true })
  state: State;

  @Column({ type: 'date', nullable: true })
  start_date: string;

  @Column({ type: 'date', nullable: true })
  due_date: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  hours_worked: number;

  @Column({ type: 'simple-json', nullable: true })
  assignees: string[];

  @Column({ default: false })
  is_mine: boolean;

  @ManyToMany(() => Label, (label) => label.issues, { cascade: true })
  @JoinTable({ name: 'issue_labels' })
  labels: Label[];

  @OneToMany(() => BoardIssue, (bi) => bi.issue)
  board_issues: BoardIssue[];

  @UpdateDateColumn()
  synced_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
