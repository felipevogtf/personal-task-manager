import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';

@Controller()
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  @Get('time-entries/summary')
  getSummary(@Query('from') from: string, @Query('to') to: string) {
    return this.service.getSummary(from, to);
  }

  @Get('issues/:issueId/time-entries')
  findAll(@Param('issueId') issueId: string) {
    return this.service.findByIssue(issueId);
  }

  @Post('issues/:issueId/time-entries')
  create(
    @Param('issueId') issueId: string,
    @Body() dto: { date: string; hours: number; note?: string },
  ) {
    return this.service.create(issueId, dto);
  }

  @Patch('time-entries/:id')
  update(
    @Param('id') id: string,
    @Body() dto: { date?: string; hours?: number; note?: string },
  ) {
    return this.service.update(id, dto);
  }

  @Delete('time-entries/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
