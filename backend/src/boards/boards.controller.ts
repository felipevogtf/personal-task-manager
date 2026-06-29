import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { BoardsService } from './boards.service';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  findAll() {
    return this.boardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; description?: string }) {
    return this.boardsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.boardsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.boardsService.remove(id);
  }

  @Post(':id/issues')
  addIssue(@Param('id') id: string, @Body() body: { issueId: string; stateId: string }) {
    return this.boardsService.addIssue(id, body.issueId, body.stateId);
  }

  @Delete(':id/issues/:boardIssueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeIssue(@Param('boardIssueId') boardIssueId: string) {
    return this.boardsService.removeIssue(boardIssueId);
  }

  @Patch(':id/issues/:boardIssueId/state')
  moveIssue(@Param('boardIssueId') boardIssueId: string, @Body() body: { stateId: string }) {
    return this.boardsService.moveIssue(boardIssueId, body.stateId);
  }
}
