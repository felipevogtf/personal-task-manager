import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Issue } from './entities/issue.entity';
import { State } from '../states/entities/state.entity';
import { Project } from '../projects/entities/project.entity';
import { Label } from '../labels/entities/label.entity';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue) private readonly repo: Repository<Issue>,
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
    @InjectRepository(Label) private readonly labelsRepo: Repository<Label>,
  ) {}

  findAll(projectId?: string, mine?: boolean, stateId?: string, noBoard?: boolean) {
    const qb = this.repo.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.labels', 'labels')
      .leftJoinAndSelect('issue.state', 'state')
      .orderBy('issue.sequence_id', 'ASC');

    if (projectId) qb.andWhere('project.id = :projectId', { projectId });
    if (mine) qb.andWhere('issue.is_mine = true');
    if (stateId === 'none') qb.andWhere('issue.stateId IS NULL');
    else if (stateId) qb.andWhere('issue.stateId = :stateId', { stateId });
    if (noBoard) qb.andWhere(
      'issue.id NOT IN (SELECT bi."issueId" FROM board_issues bi)',
    );
    return qb.getMany();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: { project: true, labels: true, state: true } });
  }

  async setState(id: string, stateId: string | null) {
    const issue = await this.repo.findOneBy({ id });
    if (!issue) return null;
    issue.state = (stateId ? { id: stateId } : null) as State;
    await this.repo.save(issue);
    return this.findOne(id);
  }

  async update(id: string, dto: { name?: string; description?: string | null; priority?: string; start_date?: string | null; due_date?: string | null; hours_worked?: number | null }) {
    const issue = await this.repo.findOneBy({ id });
    if (!issue) return null;
    Object.assign(issue, dto);
    await this.repo.save(issue);
    return this.findOne(id);
  }

  async upsert(planeIssues: any[], project: Project, myUserId?: string) {
    for (const i of planeIssues) {
      const assignees: string[] = i.assignees ?? [];
      const description = i.description_html || null;

      const fields = {
        name: i.name,
        description,
        priority: i.priority,
        plane_state: i.state,
        sequence_id: i.sequence_id,
        assignees,
        is_mine: myUserId ? assignees.includes(myUserId) : false,
      };

      const existing = await this.repo.findOneBy({ plane_id: i.id });
      if (existing) {
        await this.repo.update(existing.id, fields);
      } else {
        await this.repo.save({ plane_id: i.id, project: { id: project.id }, ...fields });
      }
    }
    return this.findAll(project.id);
  }

  async remove(id: string) {
    await this.repo.delete({ id, is_local: true });
  }

  async create(dto: { name: string; projectId: string; priority?: string; stateId?: string | null; description?: string }) {
    const row = await this.repo
      .createQueryBuilder('issue')
      .where('issue.projectId = :pid', { pid: dto.projectId })
      .select('MAX(issue.local_id)', 'max')
      .getRawOne<{ max: number | null }>();

    const issue = this.repo.create({
      is_local: true,
      is_mine: true,
      name: dto.name,
      description: dto.description ?? undefined,
      priority: dto.priority ?? 'none',
      local_id: (row?.max ?? 0) + 1,
      project: { id: dto.projectId } as any,
      state: dto.stateId ? ({ id: dto.stateId } as any) : undefined,
    });
    await this.repo.save(issue);
    return this.findOne(issue.id);
  }

  async assignLabels(id: string, labelIds: string[]) {
    const issue = await this.repo.findOne({ where: { id }, relations: { labels: true } });
    if (!issue) return null;
    issue.labels = await this.labelsRepo.findBy({ id: In(labelIds) });
    return this.repo.save(issue);
  }
}
