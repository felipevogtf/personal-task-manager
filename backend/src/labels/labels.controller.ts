import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { LabelsService } from './labels.service';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  findAll() {
    return this.labelsService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; color?: string }) {
    return this.labelsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; color?: string }) {
    return this.labelsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.labelsService.remove(id);
  }
}
