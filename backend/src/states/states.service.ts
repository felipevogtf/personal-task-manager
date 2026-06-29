import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { State } from './entities/state.entity';

const DEFAULT_STATES = [
  { name: 'Backlog', color: '#6B7280', position: 0 },
  { name: 'Todo', color: '#3B82F6', position: 1 },
  { name: 'In Progress', color: '#F59E0B', position: 2 },
  { name: 'Done', color: '#10B981', position: 3 },
];

@Injectable()
export class StatesService implements OnModuleInit {
  constructor(@InjectRepository(State) private readonly repo: Repository<State>) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) await this.repo.save(DEFAULT_STATES);
  }

  findAll() {
    return this.repo.find({ order: { position: 'ASC' } });
  }

  create(data: Partial<State>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<State>) {
    await this.repo.update(id, data);
    return this.repo.findOneBy({ id });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
