import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Board, BoardIssue } from '../../models';

@Injectable({ providedIn: 'root' })
export class BoardsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAll = () => this.http.get<Board[]>(`${this.base}/boards`);
  getOne = (id: string) => this.http.get<Board>(`${this.base}/boards/${id}`);
  create = (data: { name: string; description?: string }) =>
    this.http.post<Board>(`${this.base}/boards`, data);
  update = (id: string, data: { name?: string; description?: string }) =>
    this.http.patch<Board>(`${this.base}/boards/${id}`, data);
  remove = (id: string) => this.http.delete(`${this.base}/boards/${id}`);
  addIssue = (boardId: string, issueId: string, stateId: string) =>
    this.http.post<BoardIssue>(`${this.base}/boards/${boardId}/issues`, { issueId, stateId });
  removeIssue = (boardId: string, boardIssueId: string) =>
    this.http.delete(`${this.base}/boards/${boardId}/issues/${boardIssueId}`);
  moveIssue = (boardId: string, boardIssueId: string, stateId: string) =>
    this.http.patch<BoardIssue>(`${this.base}/boards/${boardId}/issues/${boardIssueId}/state`, { stateId });
}
