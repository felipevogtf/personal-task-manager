import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Issue } from '../../models';

@Injectable({ providedIn: 'root' })
export class IssuesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAll = (opts: { projectId?: string; mine?: boolean; stateId?: string; noBoard?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (opts.projectId) params.set('projectId', opts.projectId);
    if (opts.mine) params.set('mine', 'true');
    if (opts.stateId) params.set('stateId', opts.stateId);
    if (opts.noBoard) params.set('noBoard', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<Issue[]>(`${this.base}/issues${qs}`);
  };
  getOne = (id: string) => this.http.get<Issue>(`${this.base}/issues/${id}`);
  create = (dto: { name: string; projectId: string; priority?: string; stateId?: string; description?: string }) =>
    this.http.post<Issue>(`${this.base}/issues`, dto);
  remove = (id: string) => this.http.delete<void>(`${this.base}/issues/${id}`);
  update = (id: string, data: { name?: string; description?: string | null; priority?: string; start_date?: string | null; due_date?: string | null; hours_worked?: number | null }) =>
    this.http.patch<Issue>(`${this.base}/issues/${id}`, data);
  syncIssues = (projectId: string) =>
    this.http.post<Issue[]>(`${this.base}/sync/issues/${projectId}`, {});
  setState = (issueId: string, stateId: string | null) =>
    this.http.patch<Issue>(`${this.base}/issues/${issueId}/state`, { stateId });
  assignLabels = (issueId: string, labelIds: string[]) =>
    this.http.put<Issue>(`${this.base}/issues/${issueId}/labels`, { labelIds });
}
