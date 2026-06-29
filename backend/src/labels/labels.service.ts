import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './entities/label.entity';

@Injectable()
export class LabelsService {
  constructor(@InjectRepository(Label) private readonly repo: Repository<Label>) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  create(data: Partial<Label>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Label>) {
    await this.repo.update(id, data);
    return this.repo.findOneBy({ id });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
