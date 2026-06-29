import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plane_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  identifier: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @OneToMany(() => Issue, (issue) => issue.project)
  issues: Issue[];

  @UpdateDateColumn()
  synced_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
