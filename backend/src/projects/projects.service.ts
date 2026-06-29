import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(Project) private readonly repo: Repository<Project>) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: { issues: true } });
  }

  async upsert(planeProjects: any[]) {
    for (const p of planeProjects) {
      const fields = { name: p.name, identifier: p.identifier, description: p.description };
      const existing = await this.repo.findOneBy({ plane_id: p.id });
      if (existing) {
        await this.repo.update(existing.id, fields);
      } else {
        await this.repo.save({ plane_id: p.id, ...fields });
      }
    }
    return this.findAll();
  }
}
