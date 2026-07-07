import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { PasswordsService } from './passwords.service';

@Controller('passwords')
export class PasswordsController {
  constructor(private readonly svc: PasswordsService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get(':id/fields/:fieldId/reveal')
  reveal(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    return this.svc.reveal(id, fieldId);
  }

  @Post()
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Post(':id/fields')
  addField(@Param('id') id: string, @Body() dto: any) { return this.svc.addField(id, dto); }

  @Patch(':id/fields/:fieldId')
  updateField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Body() dto: any) {
    return this.svc.updateField(id, fieldId, dto);
  }

  @Delete(':id/fields/:fieldId')
  @HttpCode(204)
  removeField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    return this.svc.removeField(id, fieldId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
