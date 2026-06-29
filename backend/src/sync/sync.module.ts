import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { PlaneModule } from '../plane/plane.module';
import { ProjectsModule } from '../projects/projects.module';
import { IssuesModule } from '../issues/issues.module';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), PlaneModule, ProjectsModule, IssuesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
