import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';
import { Project } from '../projects/entities/project.entity';
import { Label } from '../labels/entities/label.entity';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Issue, Project, Label])],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
