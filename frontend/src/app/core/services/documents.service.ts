import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentFull, DocumentMeta } from '../../models';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/documents';

  getAll = () => this.http.get<DocumentMeta[]>(this.base);
  getOne = (id: string) => this.http.get<DocumentFull>(`${this.base}/${id}`);
  create = (dto: { title: string; content: string }) => this.http.post<DocumentFull>(this.base, dto);
  update = (id: string, dto: { title?: string; content?: string }) =>
    this.http.patch<DocumentFull>(`${this.base}/${id}`, dto);
  remove = (id: string) => this.http.delete<void>(`${this.base}/${id}`);
  exportPdf = (dto: { title: string; content: string; eyebrow?: string; preparedFor?: string; preparedBy?: string; date?: string }) =>
    this.http.post(`${this.base}/export`, dto, { responseType: 'blob', observe: 'response' });
}
