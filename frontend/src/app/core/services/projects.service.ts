import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project } from '../../models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAll = () => this.http.get<Project[]>(`${this.base}/projects`);
  sync = () => this.http.post<Project[]>(`${this.base}/sync/projects`, {});
}
