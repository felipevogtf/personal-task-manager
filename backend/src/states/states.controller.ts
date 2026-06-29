import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { StatesService } from './states.service';

@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Get()
  findAll() {
    return this.statesService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; color?: string; position?: number }) {
    return this.statesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; color?: string; position?: number }) {
    return this.statesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.statesService.remove(id);
  }
}
