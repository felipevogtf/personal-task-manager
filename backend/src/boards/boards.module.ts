import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { BoardIssue } from './entities/board-issue.entity';
import { Issue } from '../issues/entities/issue.entity';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Board, BoardIssue, Issue])],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
