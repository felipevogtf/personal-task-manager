import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Password } from './entities/password.entity';
import { PasswordField } from './entities/password-field.entity';
import { encrypt, decrypt } from './crypto.util';

interface FieldDto { key?: string; value: string; is_sensitive?: boolean; sort_order?: number; }
interface CreateDto { name: string; type?: 'single' | 'group'; category?: string; fields: FieldDto[]; }
interface UpdateDto { name?: string; category?: string; fields?: FieldDto[]; }

@Injectable()
export class PasswordsService {
  constructor(
    @InjectRepository(Password) private readonly repo: Repository<Password>,
    @InjectRepository(PasswordField) private readonly fieldRepo: Repository<PasswordField>,
  ) {}

  async findAll(): Promise<Password[]> {
    const entries = await this.repo.find({ order: { created_at: 'ASC' }, relations: { fields: true } });
    for (const entry of entries) {
      for (const field of entry.fields) {
        if (!field.is_sensitive) field.value_enc = decrypt(field.value_enc);
        else field.value_enc = '';
      }
    }
    return entries;
  }

  async reveal(id: string, fieldId: string): Promise<{ value: string }> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId, password: { id } } });
    if (!field) throw new NotFoundException();
    return { value: decrypt(field.value_enc) };
  }

  async create(dto: CreateDto): Promise<Password> {
    const entry = this.repo.create({ name: dto.name, type: dto.type ?? 'group', category: dto.category });
    const saved = await this.repo.save(entry);
    const fields = (dto.fields ?? []).map((f, i) =>
      this.fieldRepo.create({
        password: saved,
        key: f.key,
        value_enc: encrypt(f.value),
        is_sensitive: f.is_sensitive ?? false,
        sort_order: f.sort_order ?? i,
      })
    );
    await this.fieldRepo.save(fields);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateDto): Promise<Password> {
    const entry = await this.repo.findOne({ where: { id }, relations: { fields: true } });
    if (!entry) throw new NotFoundException();
    if (dto.name !== undefined) entry.name = dto.name;
    if (dto.category !== undefined) entry.category = dto.category;
    await this.repo.save(entry);
    if (dto.fields !== undefined) {
      await this.fieldRepo.delete({ password: { id } });
      const fields = dto.fields.map((f, i) =>
        this.fieldRepo.create({
          password: entry,
          key: f.key,
          value_enc: encrypt(f.value),
          is_sensitive: f.is_sensitive ?? false,
          sort_order: f.sort_order ?? i,
        })
      );
      await this.fieldRepo.save(fields);
    }
    return this.findOne(id);
  }

  async addField(id: string, dto: FieldDto): Promise<PasswordField> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException();
    const count = await this.fieldRepo.count({ where: { password: { id } } });
    const field = this.fieldRepo.create({
      password: entry,
      key: dto.key,
      value_enc: encrypt(dto.value),
      is_sensitive: dto.is_sensitive ?? false,
      sort_order: dto.sort_order ?? count,
    });
    return this.fieldRepo.save(field);
  }

  async updateField(id: string, fieldId: string, dto: Partial<FieldDto>): Promise<PasswordField> {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId, password: { id } } });
    if (!field) throw new NotFoundException();
    if (dto.key !== undefined) field.key = dto.key;
    if (dto.value !== undefined) field.value_enc = encrypt(dto.value);
    if (dto.is_sensitive !== undefined) field.is_sensitive = dto.is_sensitive;
    if (dto.sort_order !== undefined) field.sort_order = dto.sort_order;
    return this.fieldRepo.save(field);
  }

  async removeField(id: string, fieldId: string): Promise<void> {
    await this.fieldRepo.delete({ id: fieldId, password: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private async findOne(id: string): Promise<Password> {
    const entry = await this.repo.findOne({ where: { id }, relations: { fields: true } });
    if (!entry) throw new NotFoundException();
    for (const field of entry.fields) {
      if (!field.is_sensitive) field.value_enc = decrypt(field.value_enc);
      else field.value_enc = '';
    }
    return entry;
  }
}
