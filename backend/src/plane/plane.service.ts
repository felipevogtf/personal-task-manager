import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class PlaneService {
  private readonly client: AxiosInstance;
  private readonly workspaceSlug: string;

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

  async getProjects() {
    const { data } = await this.client.get(
      `/api/v1/workspaces/${this.workspaceSlug}/projects/`,
    );
    return data;
  }

  async getIssues(projectId: string) {
    const { data } = await this.client.get(
      `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/`,
    );
    return data;
  }

  async getIssue(projectId: string, issueId: string) {
    const { data } = await this.client.get(
      `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
    );
    return data;
  }

  async createIssue(projectId: string, dto: CreateIssueDto) {
    const { data } = await this.client.post(
      `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/`,
      dto,
    );
    return data;
  }

  async updateIssue(projectId: string, issueId: string, dto: UpdateIssueDto) {
    const { data } = await this.client.patch(
      `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
      dto,
    );
    return data;
  }

  async deleteIssue(projectId: string, issueId: string) {
    await this.client.delete(
      `/api/v1/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
    );
  }
}
