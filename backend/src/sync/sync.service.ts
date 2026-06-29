import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaneService } from '../plane/plane.service';
import { ProjectsService } from '../projects/projects.service';
import { IssuesService } from '../issues/issues.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly planeService: PlaneService,
    private readonly projectsService: ProjectsService,
    private readonly issuesService: IssuesService,
    private readonly config: ConfigService,
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
  ) {}

  getMe() {
    return this.planeService.getCurrentUser();
  }

  async inspectMembers(projectId: string) {
    return this.planeService.getProjectMembers(projectId);
  }

  async syncProjects() {
    const myUserId = this.config.get<string>('PLANE_USER_ID');
    const data = await this.planeService.getProjects();
    const all: any[] = Array.isArray(data) ? data : (data.results ?? []);

    if (!myUserId) return this.projectsService.upsert(all);

    const mine: any[] = [];
    for (const p of all) {
      const membersData = await this.planeService.getProjectMembers(p.id);
      const members: any[] = Array.isArray(membersData) ? membersData : (membersData.results ?? []);

      this.logger.debug(`Project "${p.name}" members sample: ${JSON.stringify(members[0])}`);

      const isMember = members.some((m) => m.id === myUserId);
      if (isMember) mine.push(p);
    }

    this.logger.log(`Sync projects: ${all.length} total, ${mine.length} mine`);
    return this.projectsService.upsert(mine);
  }

  async syncIssues(projectId: string) {
    const project = await this.projectsRepo.findOneBy({ id: projectId });
    if (!project) throw new Error(`Project ${projectId} not found`);

    const myUserId = this.config.get<string>('PLANE_USER_ID');
    const data = await this.planeService.getIssues(project.plane_id);
    const list: any[] = Array.isArray(data) ? data : (data.results ?? []);

    this.logger.log(`Sincronizando ${list.length} tareas de "${project.name}"…`);
    return this.issuesService.upsert(list, project, myUserId);
  }
}
