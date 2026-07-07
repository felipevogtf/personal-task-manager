import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Password, PasswordField } from '../../models';

interface FieldDto { key?: string; value: string; is_sensitive?: boolean; sort_order?: number; }
interface CreateDto { name: string; type?: 'single' | 'group'; category?: string; fields: FieldDto[]; }

@Injectable({ providedIn: 'root' })
export class PasswordsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/passwords';

  getAll = () => this.http.get<Password[]>(this.base);

  create = (dto: CreateDto) => this.http.post<Password>(this.base, dto);

  update = (id: string, dto: { name?: string; category?: string; fields?: FieldDto[] }) =>
    this.http.patch<Password>(`${this.base}/${id}`, dto);

  remove = (id: string) => this.http.delete<void>(`${this.base}/${id}`);

  reveal = (id: string, fieldId: string) =>
    this.http.get<{ value: string }>(`${this.base}/${id}/fields/${fieldId}/reveal`);

  addField = (id: string, dto: FieldDto) =>
    this.http.post<PasswordField>(`${this.base}/${id}/fields`, dto);

  updateField = (id: string, fieldId: string, dto: Partial<FieldDto>) =>
    this.http.patch<PasswordField>(`${this.base}/${id}/fields/${fieldId}`, dto);

  removeField = (id: string, fieldId: string) =>
    this.http.delete<void>(`${this.base}/${id}/fields/${fieldId}`);
}
