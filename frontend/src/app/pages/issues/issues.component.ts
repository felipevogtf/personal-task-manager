import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { IssuesService } from '../../core/services/issues.service';
import { ProjectsService } from '../../core/services/projects.service';
import { StatesService } from '../../core/services/states.service';
import { IssuePanelComponent } from '../../shared/issue-panel.component';
import { Issue, Project, State } from '../../models';

interface NewIssueForm { name: string; projectId: string; priority: string; stateId: string; }

interface IssueFilter { projectId: string; stateId: string; noBoard: boolean; }

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high:   'Alta',
  medium: 'Media',
  low:    'Baja',
  none:   '—',
};

@Component({
  selector: 'app-issues',
  standalone: true,
  imports: [CommonModule, IssuePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full">

      <header class="page-header">
        <h1 class="page-title">Tareas</h1>
        @if (issuesResource.isLoading()) {
          <span class="w-3.5 h-3.5 rounded-full border-2 border-ghost/30 border-t-ghost animate-spin inline-block ml-1"></span>
        } @else {
          <span class="text-[12px] text-ghost bg-raised px-2 py-0.5 rounded-full ml-1 font-mono tabular-nums">
            {{ issuesResource.value()?.length ?? 0 }}
          </span>
        }
        <button class="btn-primary ml-auto" (click)="creatingIssue.set(!creatingIssue())">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
          </svg>
          Nueva tarea
        </button>
      </header>

      <!-- Formulario nueva tarea -->
      @if (creatingIssue()) {
        <div class="flex items-center gap-2.5 px-6 py-3 border-b border-line-soft bg-surface flex-wrap flex-shrink-0">
          <input
            type="text"
            class="field-input flex-1 min-w-[240px]"
            placeholder="Nombre de la tarea…"
            [value]="newIssue().name"
            (input)="patchNew('name', $any($event.target).value)" />

          <select class="field-select" [value]="newIssue().projectId" (change)="patchNew('projectId', $any($event.target).value)">
            <option value="">Proyecto…</option>
            @for (p of projectsResource.value(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>

          <select class="field-select" [value]="newIssue().priority" (change)="patchNew('priority', $any($event.target).value)">
            <option value="none">Sin prioridad</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <select class="field-select" [value]="newIssue().stateId" (change)="patchNew('stateId', $any($event.target).value)">
            <option value="">Sin estado</option>
            @for (s of statesResource.value(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>

          <div class="flex items-center gap-2">
            <button class="btn" (click)="cancelCreate()">Cancelar</button>
            <button class="btn-primary" [disabled]="!newIssue().name.trim() || !newIssue().projectId || creating()" (click)="submitCreate()">
              {{ creating() ? 'Creando…' : 'Crear' }}
            </button>
          </div>
        </div>
      }

      <!-- Filtros -->
      <div class="flex items-center gap-2 px-6 py-3 border-b border-line-soft bg-surface">
        <select class="field-select text-[12.5px]" [value]="filter().projectId" (change)="patch('projectId', $any($event.target).value)">
          <option value="">Todos los proyectos</option>
          @for (p of projectsResource.value(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>

        <select class="field-select text-[12.5px]" [value]="filter().stateId" (change)="patch('stateId', $any($event.target).value)">
          <option value="">Todos los estados</option>
          <option value="none">Sin estado</option>
          @for (s of statesResource.value(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>

        <label class="flex items-center gap-2 text-[12.5px] text-ghost cursor-pointer select-none ml-1 hover:text-dim transition-colors">
          <input
            type="checkbox"
            [checked]="filter().noBoard"
            (change)="patch('noBoard', !filter().noBoard)"
            class="w-3.5 h-3.5 rounded border-line accent-tint cursor-pointer"
          />
          Sin tablero
        </label>
      </div>

      <!-- Tabla -->
      <div class="flex-1 overflow-auto">
        <table class="w-full">
          <thead class="sticky top-0 bg-surface z-[1]">
            <tr class="border-b border-line-soft">
              <th class="text-left py-3 px-4 text-[10.5px] font-semibold text-ghost uppercase tracking-widest w-[110px]">ID</th>
              <th class="text-left py-3 px-4 text-[10.5px] font-semibold text-ghost uppercase tracking-widest">Nombre</th>
              <th class="text-left py-3 px-4 text-[10.5px] font-semibold text-ghost uppercase tracking-widest w-[120px]">Prioridad</th>
              <th class="text-left py-3 px-4 text-[10.5px] font-semibold text-ghost uppercase tracking-widest w-[150px]">Estado</th>
              <th class="text-left py-3 px-4 text-[10.5px] font-semibold text-ghost uppercase tracking-widest w-[170px]">Fechas</th>
            </tr>
          </thead>
          <tbody>
            @if (issuesResource.isLoading()) {
              @for (i of skeletonRows; track i) {
                <tr class="border-b border-line-soft">
                  <td class="py-3 px-4"><div class="h-3 w-16 bg-raised rounded animate-pulse"></div></td>
                  <td class="py-3 px-4"><div class="h-3 rounded animate-pulse" [style.width.%]="40 + (i * 13) % 40" style="background:var(--color-raised)"></div></td>
                  <td class="py-3 px-4"><div class="h-3 w-12 bg-raised rounded animate-pulse"></div></td>
                  <td class="py-3 px-4"><div class="h-5 w-20 bg-raised rounded-full animate-pulse"></div></td>
                  <td class="py-3 px-4"><div class="h-3 w-24 bg-raised rounded animate-pulse"></div></td>
                </tr>
              }
            }
            @for (issue of issuesResource.value(); track issue.id) {
              <tr class="issue-row border-b border-line-soft cursor-pointer" (click)="selected.set(issue)">
                <td class="py-3 px-4 font-mono text-[11.5px] text-ghost whitespace-nowrap">
                  <span [class.text-tint]="issue.is_local">
                    {{ issue.project.identifier }}-{{ issue.is_local ? 'L' + issue.local_id : issue.sequence_id }}
                  </span>
                </td>
                <td class="py-3 px-4 text-[13px] font-medium text-on">{{ issue.name }}</td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span class="p-dot p-dot-{{ issue.priority }}"></span>
                    @if (issue.priority && issue.priority !== 'none') {
                      <span class="text-[12px] text-dim">{{ priorityLabel(issue.priority) }}</span>
                    } @else {
                      <span class="text-[12px] text-ghost">—</span>
                    }
                  </div>
                </td>
                <td class="py-3 px-4">
                  @if (issue.state) {
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium"
                      [style.background]="issue.state.color + '18'"
                      [style.color]="issue.state.color">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" [style.background]="issue.state.color"></span>
                      {{ issue.state.name }}
                    </span>
                  } @else {
                    <span class="text-[12px] text-ghost">—</span>
                  }
                </td>
                <td class="py-3 px-4 text-[12px] text-ghost whitespace-nowrap">
                  @if (issue.start_date || issue.due_date) {
                    {{ issue.start_date ?? '?' }} → {{ issue.due_date ?? '?' }}
                  } @else { — }
                </td>
              </tr>
            }
            @empty {
              @if (!issuesResource.isLoading()) {
                <tr>
                  <td colspan="5" class="py-20 text-center">
                    <p class="text-[13px] font-medium text-dim mb-1">Sin tareas</p>
                    <p class="text-[12px] text-ghost">Ajustá los filtros o sincronizá un proyecto</p>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

    </div>

    @if (selected()) {
      <app-issue-panel
        [issue]="selected()!"
        (closed)="selected.set(null)"
        (changed)="onIssueChanged($event)"
        (deleted)="selected.set(null); issuesResource.reload()" />
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .issue-row { transition: background 0.1s; }
    .issue-row:hover td { background: var(--color-raised); }
  `],
})
export class IssuesComponent {
  private readonly issuesService = inject(IssuesService);
  private readonly projectsService = inject(ProjectsService);
  private readonly statesService = inject(StatesService);

  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7];
  readonly filter = signal<IssueFilter>({ projectId: '', stateId: '', noBoard: false });
  readonly selected = signal<Issue | null>(null);
  readonly creatingIssue = signal(false);
  readonly creating = signal(false);
  readonly newIssue = signal<NewIssueForm>({ name: '', projectId: '', priority: 'none', stateId: '' });

  readonly projectsResource = rxResource<Project[], undefined>({ stream: () => this.projectsService.getAll() });
  readonly statesResource = rxResource<State[], undefined>({ stream: () => this.statesService.getAll() });
  readonly issuesResource = rxResource<Issue[], IssueFilter>({
    params: () => this.filter(),
    stream: ({ params }) => this.issuesService.getAll({
      projectId: params.projectId || undefined,
      stateId: params.stateId || undefined,
      noBoard: params.noBoard,
    }),
  });

  patch<K extends keyof IssueFilter>(key: K, value: IssueFilter[K]) {
    this.filter.update(f => ({ ...f, [key]: value }));
  }

  patchNew<K extends keyof NewIssueForm>(key: K, value: NewIssueForm[K]) {
    this.newIssue.update(f => ({ ...f, [key]: value }));
  }

  cancelCreate() {
    this.creatingIssue.set(false);
    this.newIssue.set({ name: '', projectId: '', priority: 'none', stateId: '' });
  }

  async submitCreate() {
    const f = this.newIssue();
    if (!f.name.trim() || !f.projectId) return;
    this.creating.set(true);
    try {
      await lastValueFrom(this.issuesService.create({
        name: f.name.trim(),
        projectId: f.projectId,
        priority: f.priority,
        stateId: f.stateId || undefined,
      }));
      this.issuesResource.reload();
      this.cancelCreate();
    } finally {
      this.creating.set(false);
    }
  }

  priorityLabel(priority: string): string {
    return PRIORITY_LABELS[priority] ?? priority;
  }

  onIssueChanged(updated: Issue) {
    this.selected.set(updated);
    this.issuesResource.reload();
  }
}
