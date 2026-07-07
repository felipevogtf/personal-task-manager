import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './projects/entities/project.entity';
import { Issue } from './issues/entities/issue.entity';
import { State } from './states/entities/state.entity';
import { Label } from './labels/entities/label.entity';
import { Board } from './boards/entities/board.entity';
import { BoardIssue } from './boards/entities/board-issue.entity';
import { TimeEntry } from './time-entries/entities/time-entry.entity';
import { Password } from './passwords/entities/password.entity';
import { PasswordField } from './passwords/entities/password-field.entity';
import { PasswordsModule } from './passwords/passwords.module';
import { ProjectsModule } from './projects/projects.module';
import { IssuesModule } from './issues/issues.module';
import { StatesModule } from './states/states.module';
import { LabelsModule } from './labels/labels.module';
import { BoardsModule } from './boards/boards.module';
import { SyncModule } from './sync/sync.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [Project, Issue, State, Label, Board, BoardIssue, TimeEntry, Password, PasswordField],
        synchronize: true,
      }),
    }),
    ProjectsModule,
    IssuesModule,
    StatesModule,
    LabelsModule,
    BoardsModule,
    SyncModule,
    TimeEntriesModule,
    PasswordsModule,
  ],
})
export class AppModule {}
