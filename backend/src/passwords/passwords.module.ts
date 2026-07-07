import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Password } from './entities/password.entity';
import { PasswordField } from './entities/password-field.entity';
import { PasswordsService } from './passwords.service';
import { PasswordsController } from './passwords.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Password, PasswordField])],
  controllers: [PasswordsController],
  providers: [PasswordsService],
})
export class PasswordsModule {}
