import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { ProjectsService } from '../../core/services/projects.service';
import { IssuesService } from '../../core/services/issues.service';
import { Project } from '../../models';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col">

      <header class="page-header">
        <h1 class="page-title">Proyectos</h1>
        <div class="ml-auto flex items-center gap-2.5">
          @if (projectsResource.isLoading()) {
            <span class="w-3.5 h-3.5 rounded-full border-2 border-ghost/30 border-t-ghost animate-spin inline-block"></span>
          }
          <button class="btn-primary" (click)="sync()" [disabled]="syncing()">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" [class.animate-spin]="syncing()">
              <path d="M3.2 7A5 5 0 0 1 13 5.5h-2a.5.5 0 0 0 0 1h3.5a.5.5 0 0 0 .5-.5V2.5a.5.5 0 0 0-1 0V4A6 6 0 0 0 2.2 7a.5.5 0 1 0 1 0zm9.6 2a5 5 0 0 1-9.8 1.5h2a.5.5 0 0 0 0-1H1.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0V12a6 6 0 0 0 11.8-3 .5.5 0 1 0-1 0z"/>
            </svg>
            {{ syncing() ? 'Sincronizando…' : 'Sincronizar con Plane' }}
          </button>
        </div>
      </header>

      <div class="page-body">

        @if (!projectsResource.isLoading() && !projectsResource.value()?.length) {
          <div class="flex flex-col items-center justify-center py-24">
            <div class="w-12 h-12 rounded-2xl bg-tint-bg flex items-center justify-center mb-4 text-tint">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="2" width="5" height="5" rx="1.5"/>
                <rect x="9" y="2" width="5" height="5" rx="1.5"/>
                <rect x="2" y="9" width="5" height="5" rx="1.5"/>
                <rect x="9" y="9" width="5" height="5" rx="1.5"/>
              </svg>
            </div>
            <p class="text-[14px] font-semibold text-on mb-1">Sin proyectos</p>
            <p class="text-[12.5px] text-ghost mb-5">Sincronizá con Plane para importar tus proyectos</p>
            <button class="btn-primary" (click)="sync()" [disabled]="syncing()">Sincronizar con Plane</button>
          </div>
        }

        <div class="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
          @for (project of projectsResource.value(); track project.id) {
            <div class="project-card bg-surface border border-line rounded-xl p-5 flex flex-col">

              <div class="flex items-start gap-3 mb-3">
                <span class="mt-0.5 px-1.5 py-0.5 bg-raised rounded-md text-[10.5px] font-mono font-medium text-ghost border border-line flex-shrink-0">
                  {{ project.identifier }}
                </span>
                <h3 class="text-[13.5px] font-semibold text-on leading-snug">{{ project.name }}</h3>
              </div>

              <p class="text-[12.5px] text-ghost leading-relaxed line-clamp-2 flex-1 min-h-[2.5rem]">
                {{ project.description || 'Sin descripción' }}
              </p>

              <div class="flex items-center justify-between mt-4 pt-4 border-t border-line-soft">
                <span class="text-[11.5px] text-ghost">
                  Sync {{ project.synced_at | date:'d MMM, HH:mm' }}
                </span>
                <button class="btn" (click)="syncIssues(project)" [disabled]="syncingIssuesId() === project.id">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" [class.animate-spin]="syncingIssuesId() === project.id">
                    <path d="M3.2 7A5 5 0 0 1 13 5.5h-2a.5.5 0 0 0 0 1h3.5a.5.5 0 0 0 .5-.5V2.5a.5.5 0 0 0-1 0V4A6 6 0 0 0 2.2 7a.5.5 0 1 0 1 0zm9.6 2a5 5 0 0 1-9.8 1.5h2a.5.5 0 0 0 0-1H1.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0V12a6 6 0 0 0 11.8-3 .5.5 0 1 0-1 0z"/>
                  </svg>
                  {{ syncingIssuesId() === project.id ? 'Sincronizando…' : 'Tareas' }}
                </button>
              </div>

            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .project-card {
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .project-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.07);
      border-color: var(--color-line);
    }
  `],
})
export class ProjectsComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly issuesService = inject(IssuesService);

  readonly projectsResource = rxResource<Project[], undefined>({ stream: () => this.projectsService.getAll() });
  readonly syncing = signal(false);
  readonly syncingIssuesId = signal<string | null>(null);

  async sync() {
    this.syncing.set(true);
    try {
      await lastValueFrom(this.projectsService.sync());
      this.projectsResource.reload();
    } finally {
      this.syncing.set(false);
    }
  }

  async syncIssues(project: Project) {
    this.syncingIssuesId.set(project.id);
    try {
      await lastValueFrom(this.issuesService.syncIssues(project.id));
    } finally {
      this.syncingIssuesId.set(null);
    }
  }
}
