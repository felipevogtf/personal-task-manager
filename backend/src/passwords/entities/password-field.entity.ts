import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Password } from './password.entity';

@Entity('password_fields')
export class PasswordField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Password, (p) => p.fields, { onDelete: 'CASCADE' })
  password: Password;

  @Column({ nullable: true })
  key: string;

  @Column({ type: 'text' })
  value_enc: string;

  @Column({ default: false })
  is_sensitive: boolean;

  @Column({ default: 0 })
  sort_order: number;
}
