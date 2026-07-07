import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PasswordField } from './password-field.entity';

@Entity('passwords')
export class Password {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'group' })
  type: 'single' | 'group';

  @Column({ nullable: true })
  category: string;

  @OneToMany(() => PasswordField, (f) => f.password, { cascade: true, eager: true })
  fields: PasswordField[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
