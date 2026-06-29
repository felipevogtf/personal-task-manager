import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: '#6B7280' })
  color: string;

  @Column({ default: 0 })
  position: number;

  @OneToMany(() => Issue, (issue) => issue.state)
  issues: Issue[];

  @CreateDateColumn()
  created_at: Date;
}
