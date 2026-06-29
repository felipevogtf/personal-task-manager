import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DashboardSummary, TimeEntry } from '../../models';

@Injectable({ providedIn: 'root' })
export class TimeEntriesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getByIssue = (issueId: string) =>
    this.http.get<TimeEntry[]>(`${this.base}/issues/${issueId}/time-entries`);

  create = (issueId: string, dto: { date: string; hours: number; note?: string }) =>
    this.http.post<TimeEntry>(`${this.base}/issues/${issueId}/time-entries`, dto);

  remove = (id: string) =>
    this.http.delete<void>(`${this.base}/time-entries/${id}`);

  getSummary = (from: string, to: string) =>
    this.http.get<DashboardSummary>(`${this.base}/time-entries/summary?from=${from}&to=${to}`);
}
