import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { BoardsService } from '../../core/services/boards.service';
import { Board } from '../../models';

type SortKey = 'name' | 'created_at';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-boards',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full">

      <header class="page-header">
        <h1 class="page-title">Tableros</h1>
        @if (boardsResource.isLoading()) {
          <span class="w-3.5 h-3.5 rounded-full border-2 border-ghost/30 border-t-ghost animate-spin inline-block ml-1"></span>
        } @else {
          <span class="text-[12px] text-ghost bg-raised px-2 py-0.5 rounded-full ml-1 font-mono tabular-nums">
            {{ boardsResource.value()?.length ?? 0 }}
          </span>
        }
        <button class="btn-primary ml-auto" (click)="creating.set(true)">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
          </svg>
          Nuevo tablero
        </button>
      </header>

      <!-- Formulario de creación -->
      @if (creating()) {
        <div class="flex items-center gap-2.5 px-6 py-3 border-b border-line-soft bg-surface flex-wrap">
          <input
            class="field-input max-w-[220px]"
            [value]="newName()"
            (input)="newName.set($any($event.target).value)"
            placeholder="Nombre del tablero"
            autofocus
          />
          <input
            class="field-input flex-1 min-w-[200px]"
            [value]="newDescription()"
            (input)="newDescription.set($any($event.target).value)"
            placeholder="Descripción (opcional)"
          />
          <div class="flex items-center gap-2">
            <button class="btn" (click)="creating.set(false); newName.set(''); newDescription.set('')">Cancelar</button>
            <button class="btn-primary" (click)="create()" [disabled]="!newName()">Crear</button>
          </div>
        </div>
      }

      <!-- Tabla -->
      <div class="flex-1 overflow-auto">
        <table class="w-full">
          <thead class="sticky top-0 bg-surface z-[1]">
            <tr class="border-b border-line-soft">
              <th class="text-left py-3 px-4 w-8"></th>
              <th class="py-3 px-4 text-left">
                <button class="sort-btn" (click)="setSort('name')">
                  Nombre
                  <span class="sort-icon">{{ sortIndicator('name') }}</span>
                </button>
              </th>
              <th class="text-left py-3 px-4 text-[10.5px] font-semibold text-ghost uppercase tracking-widest w-[200px]">Descripción</th>
              <th class="py-3 px-4 text-left w-[160px]">
                <button class="sort-btn" (click)="setSort('created_at')">
                  Creado
                  <span class="sort-icon">{{ sortIndicator('created_at') }}</span>
                </button>
              </th>
              <th class="py-3 px-4 w-[140px]"></th>
            </tr>
          </thead>
          <tbody>
            @if (boardsResource.isLoading()) {
              @for (i of [1,2,3]; track i) {
                <tr class="border-b border-line-soft">
                  <td class="py-3 px-4"><div class="w-5 h-5 bg-raised rounded animate-pulse"></div></td>
                  <td class="py-3 px-4"><div class="h-3 w-36 bg-raised rounded animate-pulse"></div></td>
                  <td class="py-3 px-4"><div class="h-3 w-48 bg-raised rounded animate-pulse"></div></td>
                  <td class="py-3 px-4"><div class="h-3 w-20 bg-raised rounded animate-pulse"></div></td>
                  <td class="py-3 px-4"></td>
                </tr>
              }
            }
            @for (board of sorted(); track board.id) {
              <tr class="board-row border-b border-line-soft">
                <td class="py-3 px-4">
                  <div class="w-6 h-6 rounded-lg bg-tint-bg flex items-center justify-center text-tint flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="2" width="4" height="12" rx="1.5"/>
                      <rect x="6" y="2" width="4" height="8.5" rx="1.5"/>
                      <rect x="11" y="2" width="4" height="10" rx="1.5"/>
                    </svg>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <a class="text-[13px] font-medium text-on hover:text-tint transition-colors" [routerLink]="['/boards', board.id]">
                    {{ board.name }}
                  </a>
                </td>
                <td class="py-3 px-4 text-[12.5px] text-ghost truncate max-w-[200px]">
                  {{ board.description || '—' }}
                </td>
                <td class="py-3 px-4 text-[12px] text-ghost whitespace-nowrap">
                  {{ board.created_at | date:'d MMM yyyy' }}
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-end gap-1 opacity-0 row-actions">
                    <a class="btn" [routerLink]="['/boards', board.id]">Abrir</a>
                    <button class="btn-danger" (click)="remove(board.id, board.name)" title="Eliminar">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66H14.5a.5.5 0 0 0 0-1H11z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            }
            @empty {
              @if (!boardsResource.isLoading()) {
                <tr>
                  <td colspan="5" class="py-24 text-center">
                    <div class="flex flex-col items-center">
                      <div class="w-12 h-12 rounded-2xl bg-tint-bg flex items-center justify-center mb-4 text-tint">
                        <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="1" y="2" width="4" height="12" rx="1.5"/>
                          <rect x="6" y="2" width="4" height="8.5" rx="1.5"/>
                          <rect x="11" y="2" width="4" height="10" rx="1.5"/>
                        </svg>
                      </div>
                      <p class="text-[14px] font-semibold text-on mb-1">Sin tableros</p>
                      <p class="text-[12.5px] text-ghost mb-5">Crea un tablero para organizar tus tareas en columnas</p>
                      <button class="btn-primary" (click)="creating.set(true)">Crear tablero</button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    .board-row { transition: background 0.1s; }
    .board-row:hover td { background: var(--color-raised); }
    .board-row:hover .row-actions { opacity: 1; }
    .row-actions { transition: opacity 0.12s; }

    .sort-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ghost);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: color 0.12s;
    }
    .sort-btn:hover { color: var(--color-dim); }
    .sort-btn.active { color: var(--color-on); }
    .sort-icon { font-size: 10px; }
  `],
})
export class BoardsComponent {
  private readonly boardsService = inject(BoardsService);

  readonly boardsResource = rxResource<Board[], undefined>({ stream: () => this.boardsService.getAll() });
  readonly creating = signal(false);
  readonly newName = signal('');
  readonly newDescription = signal('');
  readonly sortKey = signal<SortKey>('created_at');
  readonly sortDir = signal<SortDir>('desc');

  readonly sorted = computed(() => {
    const boards = [...(this.boardsResource.value() ?? [])];
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return boards.sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  setSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  async create() {
    await lastValueFrom(this.boardsService.create({ name: this.newName(), description: this.newDescription() }));
    this.boardsResource.reload();
    this.creating.set(false);
    this.newName.set('');
    this.newDescription.set('');
  }

  async remove(id: string, name: string) {
    if (!confirm(`¿Eliminar el tablero "${name}"?`)) return;
    await lastValueFrom(this.boardsService.remove(id));
    this.boardsResource.reload();
  }
}
