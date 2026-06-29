import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label } from '../../models';

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAll = () => this.http.get<Label[]>(`${this.base}/labels`);
  create = (data: Partial<Label>) => this.http.post<Label>(`${this.base}/labels`, data);
  update = (id: string, data: Partial<Label>) => this.http.patch<Label>(`${this.base}/labels/${id}`, data);
  remove = (id: string) => this.http.delete(`${this.base}/labels/${id}`);
}
