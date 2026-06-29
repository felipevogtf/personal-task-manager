import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';

@Entity('time_entries')
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE', nullable: false })
  issue: Issue;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  hours: number;

  @Column({ nullable: true, type: 'text' })
  note: string | null;

  @CreateDateColumn()
  created_at: Date;
}
