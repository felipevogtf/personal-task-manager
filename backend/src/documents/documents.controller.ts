import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  create(@Body() dto: { title: string; content: string }) { return this.svc.create(dto); }

  @Post('export')
  async exportPdf(
    @Body() dto: { title: string; content: string; eyebrow?: string; preparedFor?: string; preparedBy?: string; date?: string },
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.svc.exportPdf(dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { title?: string; content?: string }) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
