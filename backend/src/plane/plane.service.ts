import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class PlaneService {
  private readonly client: AxiosInstance;
  private readonly workspaceSlug: string;
  private readonly logger = new Logger(PlaneService.name);

  constructor(private readonly config: ConfigService) {
    this.workspaceSlug = this.config.getOrThrow<string>('PLANE_WORKSPACE_SLUG');

    this.client = axios.create({
      baseURL: this.config.getOrThrow<string>('PLANE_API_URL'),
      headers: {
        'X-Api-Key': this.config.getOrThrow<string>('PLANE_API_KEY'),
        'Content-Type': 'application/json',
      },
    });
  }

  private async call<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
    try {
      const { data } = await fn();
      return data;
    } catch (err) {
      if (!axios.isAxiosError(err)) throw err;

      const status = err.response?.status;
      const body = err.response?.data;
      const detail: string =
        body?.detail ?? body?.error ?? body?.message ?? err.message;

      this.logger.error(`Plane API error ${status ?? 'network'}: ${detail}`);

      if (!status) {
        throw new HttpException(
          'No se pudo conectar con Plane. Verifica la URL y la red.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const messages: Record<number, string> = {
        401: 'API key de Plane inválida o expirada.',
        403: 'Sin permisos para realizar esta acción en Plane.',
        404: 'Recurso no encontrado en Plane.',
        429: 'Límite de requests de Plane alcanzado. Intenta más tarde.',
      };

      throw new HttpException(
        messages[status] ?? `Plane respondió con error ${status}: ${detail}`,
        status >= 400 && status < 500 ? status : HttpStatus.BAD_GATEWAY,
      );
    }
  }

  getCurrentUser() {
    return this.call(() => this.client.get('/api/v1/users/me/'));
  }

  getProjects() {
    return this.call(() =>
      this.client.get(`/api/v1/workspaces/${this.workspaceSlug}/projects/`),
    );
  }

  getProjectMembers(projectId: string) {
    return this.call(() =>
      this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/members/`,
      ),
    );
  }

  getIssues(projectId: string) {
    return this.call(() =>
      this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/`,
      ),
    );
  }

  getIssue(projectId: string, issueId: string) {
    return this.call(() =>
      this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
      ),
    );
  }

  createIssue(projectId: string, dto: CreateIssueDto) {
    return this.call(() =>
      this.client.post(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/`,
        dto,
      ),
    );
  }

  updateIssue(projectId: string, issueId: string, dto: UpdateIssueDto) {
    return this.call(() =>
      this.client.patch(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
        dto,
      ),
    );
  }

  async deleteIssue(projectId: string, issueId: string) {
    await this.call(() =>
      this.client.delete(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
      ),
    );
  }
}
