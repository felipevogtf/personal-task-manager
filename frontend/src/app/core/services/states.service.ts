import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { State } from '../../models';

@Injectable({ providedIn: 'root' })
export class StatesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAll = () => this.http.get<State[]>(`${this.base}/states`);
  create = (data: Partial<State>) => this.http.post<State>(`${this.base}/states`, data);
  update = (id: string, data: Partial<State>) => this.http.patch<State>(`${this.base}/states/${id}`, data);
  remove = (id: string) => this.http.delete(`${this.base}/states/${id}`);
}
