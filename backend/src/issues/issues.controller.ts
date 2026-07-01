import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { IssuesService } from './issues.service';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('mine') mine?: string,
    @Query('stateId') stateId?: string,
    @Query('noBoard') noBoard?: string,
  ) {
    return this.issuesService.findAll(projectId, mine === 'true', stateId, noBoard === 'true');
  }

  @Post()
  create(@Body() body: { name: string; projectId: string; priority?: string; stateId?: string; description?: string }) {
    return this.issuesService.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string | null; priority?: string; start_date?: string | null; due_date?: string | null; hours_worked?: number | null },
  ) {
    return this.issuesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.issuesService.remove(id);
  }

  @Patch(':id/state')
  setState(@Param('id') id: string, @Body() body: { stateId: string | null }) {
    return this.issuesService.setState(id, body.stateId);
  }

  @Put(':id/labels')
  assignLabels(@Param('id') id: string, @Body() body: { labelIds: string[] }) {
    return this.issuesService.assignLabels(id, body.labelIds);
  }
}
