import { Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService implements OnModuleInit {
  private docsPath: string;

  constructor(
    @InjectRepository(Document) private readonly repo: Repository<Document>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    this.docsPath = this.config.get<string>('DOCUMENTS_PATH') ?? './documents';
    await mkdir(this.docsPath, { recursive: true });
  }

  findAll(): Promise<Document[]> {
    return this.repo.find({ order: { updated_at: 'DESC' } });
  }

  async findOne(id: string): Promise<Document & { content: string }> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException();
    const filePath = join(this.docsPath, doc.filename);
    let content = '';
    try { content = await readFile(filePath, 'utf-8'); } catch { content = ''; }
    return { ...doc, content };
  }

  async create(dto: { title: string; content: string }): Promise<Document & { content: string }> {
    const doc = this.repo.create({ title: dto.title, filename: '' });
    const saved = await this.repo.save(doc);
    saved.filename = `${saved.id}.md`;
    await this.repo.save(saved);
    await writeFile(join(this.docsPath, saved.filename), dto.content, 'utf-8');
    return { ...saved, content: dto.content };
  }

  async update(id: string, dto: { title?: string; content?: string }): Promise<Document & { content: string }> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException();
    if (dto.title !== undefined) doc.title = dto.title;
    await this.repo.save(doc);
    if (dto.content !== undefined) {
      await writeFile(join(this.docsPath, doc.filename), dto.content, 'utf-8');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException();
    try { await unlink(join(this.docsPath, doc.filename)); } catch { /* file may not exist */ }
    await this.repo.delete(id);
  }

  async exportPdf(dto: {
    title: string;
    content: string;
    eyebrow?: string;
    preparedFor?: string;
    preparedBy?: string;
    date?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const defaultScript = join(
      process.cwd(),
      'scripts', 'markdown2pdf', 'garagelabs-template', 'md2pdf_garagelabs.py',
    );
    const scriptPath = this.config.get<string>('PDF_SCRIPT') ?? defaultScript;

    const uid = randomUUID();
    const inputPath = join(tmpdir(), `${uid}.md`);
    const outputPath = join(tmpdir(), `${uid}.pdf`);

    const hasH1 = /^# .+/m.test(dto.content);
    const mdContent = hasH1 ? dto.content : `# ${dto.title}\n\n${dto.content}`;
    await writeFile(inputPath, mdContent, 'utf-8');

    try {
      await new Promise<void>((resolve, reject) => {
        const args = [scriptPath, '--input', inputPath, '--output', outputPath];
        if (dto.eyebrow) args.push('--eyebrow', dto.eyebrow);
        if (dto.preparedFor) args.push('--prepared-for', dto.preparedFor);
        if (dto.preparedBy) args.push('--prepared-by', dto.preparedBy);
        if (dto.date) args.push('--date', dto.date);

        const proc = spawn('python3', args, { cwd: dirname(scriptPath) });
        let stderr = '';
        proc.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
        proc.on('error', (err: Error) =>
          reject(new InternalServerErrorException(`No se pudo ejecutar python3: ${err.message}`)),
        );
        proc.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new InternalServerErrorException(`Error generando PDF:\n${stderr}`));
        });
      });

      const buffer = await readFile(outputPath);
      const safeName = dto.title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\w -]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 80) || 'document';
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      return { buffer, filename: `${safeName}_${ts}.pdf` };
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  }
}
