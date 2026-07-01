import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { BoardsService } from '../../../core/services/boards.service';
import { StatesService } from '../../../core/services/states.service';
import { IssuesService } from '../../../core/services/issues.service';
import { Board, BoardIssue, Issue, State } from '../../../models';
import { IssuePanelComponent } from '../../../shared/issue-panel.component';

interface Column { state: State; items: BoardIssue[]; }

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DragDropModule, IssuePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full">

      <header class="page-header flex-shrink-0">
        <a class="btn" routerLink="/boards">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
          </svg>
          Tableros
        </a>
        <span class="text-ghost">/</span>
        <h1 class="page-title">{{ boardResource.value()?.name ?? '…' }}</h1>
        <button class="btn-primary ml-auto" (click)="addingIssue.set(!addingIssue())">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
          </svg>
          Agregar tarea
        </button>
      </header>

      <!-- Formulario agregar tarea -->
      @if (addingIssue()) {
        <div class="flex items-center gap-2.5 px-6 py-3 border-b border-line-soft bg-surface flex-wrap flex-shrink-0">

          <!-- Autocomplete -->
          <div class="relative flex-1 min-w-[300px]">
            <input
              type="text"
              class="field-input w-full"
              placeholder="Buscar por código o nombre… (ej: GL-42)"
              [value]="searchQuery()"
              (input)="onSearchInput($any($event.target).value)"
              (focus)="showDropdown.set(true)"
              (blur)="onSearchBlur()"
              (keydown)="onSearchKeydown($event)" />

            @if (showDropdown() && searchResults().length) {
              <div class="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-line rounded-xl shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
                @for (issue of searchResults(); track issue.id; let i = $index) {
                  <div
                    class="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
                    [class.bg-raised]="highlightedIndex() === i"
                    [class.bg-tint-bg]="selectedIssueId() === issue.id"
                    (mousedown)="selectIssue(issue)">
                    <span class="p-dot p-dot-{{ issue.priority }} flex-shrink-0"></span>
                    <span class="text-[11.5px] font-mono text-ghost flex-shrink-0 w-[64px]">{{ issue.project.identifier }}-{{ issue.is_local ? 'L' + issue.local_id : issue.sequence_id }}</span>
                    <span class="text-[13px] text-on truncate">{{ issue.name }}</span>
                  </div>
                }
              </div>
            }

            @if (showDropdown() && searchQuery() && !searchResults().length) {
              <div class="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-line rounded-xl shadow-lg p-4 text-center text-[12px] text-ghost">
                Sin resultados para "{{ searchQuery() }}"
              </div>
            }
          </div>

          <select class="field-select" (change)="selectedStateId.set($any($event.target).value)">
            <option value="">Columna inicial…</option>
            @for (state of statesResource.value(); track state.id) {
              <option [value]="state.id" [selected]="selectedStateId() === state.id">{{ state.name }}</option>
            }
          </select>

          <div class="flex items-center gap-2">
            <button class="btn" (click)="cancelAdd()">Cancelar</button>
            <button class="btn-primary" (click)="addIssue()" [disabled]="!selectedIssueId() || !selectedStateId()">Agregar</button>
          </div>
        </div>
      }

      <!-- Columnas kanban -->
      <div class="flex-1 overflow-auto p-5">
        <div class="flex gap-4 items-start h-full" style="min-width: max-content">
          @for (col of columns(); track col.state.id) {
            <div class="w-[272px] flex-shrink-0 flex flex-col">

              <!-- Cabecera de columna -->
              <div class="flex items-center gap-2 px-1 pb-2.5">
                <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="col.state.color"></span>
                <span class="text-[12.5px] font-medium text-dim flex-1">{{ col.state.name }}</span>
                <span class="text-[11px] text-ghost font-mono tabular-nums">{{ col.items.length }}</span>
              </div>

              <!-- Zona de drop -->
              <div
                class="flex flex-col gap-2 min-h-[80px] rounded-xl p-1.5 transition-colors"
                cdkDropList
                [cdkDropListData]="col.items"
                [id]="col.state.id"
                [cdkDropListConnectedTo]="connectedLists()"
                (cdkDropListDropped)="onDrop($event, col.state)">

                @for (bi of col.items; track bi.id) {
                  <div
                    class="issue-card bg-surface rounded-xl p-3.5 cursor-grab relative group"
                    cdkDrag
                    (click)="selected.set(bi.issue)">

                    <p class="text-[13px] font-medium text-on leading-snug mb-3 pr-5">{{ bi.issue.name }}</p>

                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="p-dot p-dot-{{ bi.issue.priority }}"></span>
                      <span class="text-[11px] text-ghost font-mono">
                        {{ bi.issue.project.identifier }}-{{ bi.issue.is_local ? 'L' + bi.issue.local_id : bi.issue.sequence_id }}
                      </span>
                      @if (bi.issue.labels.length) {
                        @for (label of bi.issue.labels; track label.id) {
                          <span class="label-chip" [style.background]="label.color">{{ label.name }}</span>
                        }
                      }
                    </div>

                    <button
                      class="remove-issue-btn"
                      (click)="$event.stopPropagation(); removeIssue(bi)">
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                        <path d="M1 1l8 8M9 1L1 9"/>
                      </svg>
                    </button>

                  </div>
                }

                @if (!col.items.length) {
                  <div class="flex items-center justify-center h-14 text-[11.5px] text-ghost border border-dashed border-line rounded-xl">
                    Soltar aquí
                  </div>
                }

              </div>
            </div>
          }

          @if (!columns().length && !boardResource.isLoading()) {
            <div class="flex items-center justify-center w-full py-20 text-[12px] text-ghost">
              Sin estados configurados. Crea estados primero.
            </div>
          }
        </div>
      </div>

    </div>

    @if (selected()) {
      <app-issue-panel
        [issue]="selected()!"
        (closed)="selected.set(null)"
        (changed)="onIssueChanged($event)"
        (deleted)="selected.set(null); boardResource.reload()" />
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    .issue-card {
      border: 1px solid var(--color-line-soft);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .issue-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
      border-color: var(--color-line);
    }

    .remove-issue-btn {
      position: absolute;
      top: 8px; right: 8px;
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px;
      border-radius: 5px;
      background: transparent;
      border: none;
      color: var(--color-ghost);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.12s, color 0.12s, background 0.12s;
    }
    .group:hover .remove-issue-btn { opacity: 1; }
    .remove-issue-btn:hover {
      color: var(--color-bad);
      background: var(--color-raised);
    }
  `],
})
export class BoardDetailComponent {
  private readonly boardsService = inject(BoardsService);
  private readonly statesService = inject(StatesService);
  private readonly issuesService = inject(IssuesService);
  private readonly boardId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  readonly addingIssue = signal(false);
  readonly selectedIssueId = signal('');
  readonly selectedStateId = signal('');
  readonly selected = signal<Issue | null>(null);
  readonly searchQuery = signal('');
  readonly showDropdown = signal(false);
  readonly highlightedIndex = signal(-1);

  readonly statesResource = rxResource<State[], undefined>({ stream: () => this.statesService.getAll() });
  readonly allIssuesResource = rxResource<Issue[], undefined>({ stream: () => this.issuesService.getAll() });
  readonly boardResource = rxResource<Board, undefined>({ stream: () => this.boardsService.getOne(this.boardId) });

  readonly columns = computed<Column[]>(() => {
    const board = this.boardResource.value();
    const states = this.statesResource.value() ?? [];
    if (!board) return [];
    return states.map(state => ({
      state,
      items: (board.board_issues ?? []).filter((bi: BoardIssue) => bi.issue.state?.id === state.id),
    }));
  });

  readonly connectedLists = computed(() => (this.statesResource.value() ?? []).map(s => s.id));

  readonly availableIssues = computed(() => {
    const inBoard = new Set((this.boardResource.value()?.board_issues ?? []).map(bi => bi.issue.id));
    return (this.allIssuesResource.value() ?? []).filter((i: Issue) => !inBoard.has(i.id));
  });

  readonly searchResults = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const issues = this.availableIssues();
    if (!q) return issues.slice(0, 30);
    return issues.filter(i => {
      const code = `${i.project.identifier}-${i.is_local ? 'l' + i.local_id : i.sequence_id}`.toLowerCase();
      return code.includes(q) || i.name.toLowerCase().includes(q);
    }).slice(0, 30);
  });

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.selectedIssueId.set('');
    this.showDropdown.set(true);
    this.highlightedIndex.set(-1);
  }

  onSearchBlur() {
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  onSearchKeydown(event: KeyboardEvent) {
    const results = this.searchResults();
    const idx = this.highlightedIndex();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.set(Math.min(idx + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.set(Math.max(idx - 1, -1));
    } else if (event.key === 'Enter' && idx >= 0) {
      event.preventDefault();
      this.selectIssue(results[idx]);
    } else if (event.key === 'Escape') {
      this.showDropdown.set(false);
    }
  }

  selectIssue(issue: Issue) {
    this.selectedIssueId.set(issue.id);
    this.searchQuery.set(`${issue.project.identifier}-${issue.is_local ? 'L' + issue.local_id : issue.sequence_id}  ${issue.name}`);
    this.showDropdown.set(false);
  }

  cancelAdd() {
    this.addingIssue.set(false);
    this.searchQuery.set('');
    this.selectedIssueId.set('');
    this.selectedStateId.set('');
    this.showDropdown.set(false);
  }

  priorityLabel(priority: string): string {
    const labels: Record<string, string> = { urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja', none: '—' };
    return labels[priority] ?? priority;
  }

  async addIssue() {
    await lastValueFrom(this.boardsService.addIssue(this.boardId, this.selectedIssueId(), this.selectedStateId()));
    this.boardResource.reload();
    this.allIssuesResource.reload();
    this.cancelAdd();
  }

  async removeIssue(bi: BoardIssue) {
    await lastValueFrom(this.boardsService.removeIssue(this.boardId, bi.id));
    this.boardResource.reload();
  }

  onIssueChanged(updated: Issue) {
    this.selected.set(updated);
    this.boardResource.reload();
  }

  onDrop(event: CdkDragDrop<BoardIssue[]>, targetState: State) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const bi = event.previousContainer.data[event.previousIndex];
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.boardsService.moveIssue(this.boardId, bi.id, targetState.id).subscribe(() => {
      this.boardResource.reload();
      if (this.selected()?.id === bi.issue.id) {
        this.selected.set({ ...bi.issue, state: targetState });
      }
    });
  }
}
