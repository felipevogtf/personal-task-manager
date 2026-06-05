import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlaneService } from './plane.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Controller('projects')
export class PlaneController {
  constructor(private readonly planeService: PlaneService) {}

  @Get()
  getProjects() {
    return this.planeService.getProjects();
  }

  @Get(':projectId/issues')
  getIssues(@Param('projectId') projectId: string) {
    return this.planeService.getIssues(projectId);
  }

  @Get(':projectId/issues/:issueId')
  getIssue(
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
  ) {
    return this.planeService.getIssue(projectId, issueId);
  }

  @Post(':projectId/issues')
  createIssue(
    @Param('projectId') projectId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.planeService.createIssue(projectId, dto);
  }

  @Patch(':projectId/issues/:issueId')
  updateIssue(
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.planeService.updateIssue(projectId, issueId, dto);
  }

  @Delete(':projectId/issues/:issueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteIssue(
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
  ) {
    return this.planeService.deleteIssue(projectId, issueId);
  }
}
