import { Controller, Get, Param, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('me')
  getMe() {
    return this.syncService.getMe();
  }

  @Get('members/:projectId')
  inspectMembers(@Param('projectId') projectId: string) {
    return this.syncService.inspectMembers(projectId);
  }

  @Post('projects')
  syncProjects() {
    return this.syncService.syncProjects();
  }

  @Post('issues/:projectId')
  syncIssues(@Param('projectId') projectId: string) {
    return this.syncService.syncIssues(projectId);
  }
}
