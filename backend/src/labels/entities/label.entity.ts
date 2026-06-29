import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: '#3B82F6' })
  color: string;

  @ManyToMany(() => Issue, (issue) => issue.labels)
  issues: Issue[];

  @CreateDateColumn()
  created_at: Date;
}
