import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TimeEntriesService } from '../../core/services/time-entries.service';
import { DashboardSummary } from '../../models';

function weekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const from = new Date(now);
  from.setDate(now.getDate() + mondayOffset);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

interface DateRange { from: string; to: string; }
type Preset = 'week' | 'month' | 'custom';
type ByIssueItem = DashboardSummary['byIssue'][number];
interface ProjectGroup { projectId: string; projectName: string; totalHours: number; items: ByIssueItem[]; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full">

      <header class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <div class="ml-auto flex items-center gap-2">
          <div class="flex items-center border border-line rounded-lg overflow-hidden text-[12px]">
            <button
              class="px-3 h-[30px] transition-colors"
              [class.bg-tint]="preset() === 'week'"
              [class.text-white]="preset() === 'week'"
              [class.text-ghost]="preset() !== 'week'"
              [class.hover:bg-raised]="preset() !== 'week'"
              (click)="setPreset('week')">Esta semana</button>
            <span class="w-px h-4 bg-line"></span>
            <button
              class="px-3 h-[30px] transition-colors"
              [class.bg-tint]="preset() === 'month'"
              [class.text-white]="preset() === 'month'"
              [class.text-ghost]="preset() !== 'month'"
              [class.hover:bg-raised]="preset() !== 'month'"
              (click)="setPreset('month')">Este mes</button>
          </div>
          <label class="flex items-center gap-1.5 text-[12px] text-ghost">
            Desde
            <input type="date" class="field-input w-[140px] text-[12px]"
              [value]="range().from"
              (change)="setFrom($any($event.target).value)" />
          </label>
          <label class="flex items-center gap-1.5 text-[12px] text-ghost">
            Hasta
            <input type="date" class="field-input w-[140px] text-[12px]"
              [value]="range().to"
              (change)="setTo($any($event.target).value)" />
          </label>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        @if (summaryResource.isLoading()) {
          <div class="flex items-center gap-2 text-[12.5px] text-ghost">
            <span class="w-3.5 h-3.5 rounded-full border-2 border-ghost/30 border-t-ghost animate-spin"></span>
            Cargando…
          </div>
        }

        @if (summary(); as s) {

          <!-- Tarjetas de resumen -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-surface border border-line rounded-xl p-5">
              <p class="text-[11px] font-semibold text-ghost uppercase tracking-widest mb-2">Total horas</p>
              <p class="text-[32px] font-semibold text-on tracking-tight leading-none">
                {{ s.totalHours | number:'1.0-1' }}<span class="text-[18px] text-ghost font-normal ml-1">h</span>
              </p>
            </div>
            <div class="bg-surface border border-line rounded-xl p-5">
              <p class="text-[11px] font-semibold text-ghost uppercase tracking-widest mb-2">Días trabajados</p>
              <p class="text-[32px] font-semibold text-on tracking-tight leading-none">{{ s.daysWorked }}</p>
            </div>
            <div class="bg-surface border border-line rounded-xl p-5">
              <p class="text-[11px] font-semibold text-ghost uppercase tracking-widest mb-2">Tareas</p>
              <p class="text-[32px] font-semibold text-on tracking-tight leading-none">{{ s.byIssue.length }}</p>
            </div>
          </div>

          <!-- Horas por día -->
          @if (s.byDate.length) {
            <div class="bg-surface border border-line rounded-xl overflow-hidden">
              <div class="px-5 py-4 border-b border-line-soft">
                <h2 class="text-[12.5px] font-semibold text-on">Horas por día</h2>
              </div>
              <div class="p-5 flex flex-col gap-2.5">
                @for (day of s.byDate; track day.date) {
                  <div class="flex items-center gap-3">
                    <span class="text-[12px] text-ghost w-[72px] flex-shrink-0 tabular-nums">
                      {{ day.date | date:'d MMM' }}
                    </span>
                    <div class="flex-1 h-6 rounded-md bg-raised overflow-hidden">
                      <div
                        class="h-full rounded-md bg-tint/80 transition-all duration-300"
                        [style.width.%]="(day.hours / maxDayHours()) * 100">
                      </div>
                    </div>
                    <span class="text-[12.5px] font-medium text-dim w-[42px] text-right tabular-nums flex-shrink-0">
                      {{ day.hours | number:'1.0-1' }}h
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Tareas trabajadas agrupadas por proyecto -->
          @if (s.byIssue.length) {
            @for (group of projectGroups(); track group.projectId) {
              <div class="bg-surface border border-line rounded-xl overflow-hidden">

                <!-- Cabecera del proyecto -->
                <div
                  class="flex items-center gap-3 px-5 py-3.5 border-b border-line-soft cursor-pointer select-none hover:bg-raised transition-colors"
                  (click)="toggleProjectGroup(group.projectId)">
                  <svg
                    class="flex-shrink-0 text-ghost transition-transform duration-150"
                    [style.transform]="collapsedGroups().has(group.projectId) ? 'rotate(-90deg)' : 'rotate(0deg)'"
                    width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 4l4 4 4-4"/>
                  </svg>
                  <h2 class="text-[12.5px] font-semibold text-on flex-1">{{ group.projectName }}</h2>
                  <span class="text-[13px] font-semibold text-tint tabular-nums">{{ group.totalHours | number:'1.0-1' }}h</span>
                </div>

                @if (!collapsedGroups().has(group.projectId)) {
                  <div class="divide-y divide-line-soft">
                    @for (item of group.items; track item.issue.id) {
                      <div class="px-5 py-4">
                        <div class="flex items-start justify-between gap-4 mb-2">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <span class="text-[11.5px] font-mono text-ghost flex-shrink-0">
                              {{ item.issue.project.identifier }}-{{ item.issue.is_local ? 'L' + item.issue.local_id : item.issue.sequence_id }}
                            </span>
                            <span class="text-[13px] font-medium text-on truncate">{{ item.issue.name }}</span>
                          </div>
                          <span class="text-[13px] font-semibold text-dim flex-shrink-0 tabular-nums">{{ item.totalHours | number:'1.0-1' }}h</span>
                        </div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1">
                          @for (entry of item.entries; track entry.id) {
                            <span class="text-[11.5px] text-ghost">
                              {{ entry.date | date:'d MMM' }}
                              <span class="text-dim font-medium">{{ entry.hours | number:'1.0-1' }}h</span>
                              @if (entry.note) { <span class="italic"> — {{ entry.note }}</span> }
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }

              </div>
            }
          }

          @if (!s.totalHours) {
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <p class="text-[14px] font-semibold text-on mb-1">Sin registros</p>
              <p class="text-[12.5px] text-ghost">No hay horas cargadas en este período</p>
            </div>
          }

        }
      </div>
    </div>
  `,
  styles: [`:host { display: flex; flex-direction: column; height: 100%; }`],
})
export class DashboardComponent {
  private readonly timeEntriesService = inject(TimeEntriesService);

  readonly preset = signal<Preset>('week');
  readonly range = signal<DateRange>(weekRange());

  readonly summaryResource = rxResource<DashboardSummary, DateRange>({
    params: () => this.range(),
    stream: ({ params: { from, to } }) => this.timeEntriesService.getSummary(from, to),
  });

  readonly summary = computed(() => this.summaryResource.value());

  readonly maxDayHours = computed(() => {
    const dates = this.summary()?.byDate ?? [];
    return Math.max(...dates.map(d => d.hours), 1);
  });

  readonly collapsedGroups = signal<Set<string>>(new Set());

  readonly projectGroups = computed((): ProjectGroup[] => {
    const map = new Map<string, ProjectGroup>();
    for (const item of this.summary()?.byIssue ?? []) {
      const pid = item.issue.project.id;
      if (!map.has(pid)) map.set(pid, { projectId: pid, projectName: item.issue.project.name, totalHours: 0, items: [] });
      const g = map.get(pid)!;
      g.items.push(item);
      g.totalHours += item.totalHours;
    }
    return [...map.values()].sort((a, b) => b.totalHours - a.totalHours);
  });

  toggleProjectGroup(projectId: string) {
    this.collapsedGroups.update(s => {
      const next = new Set(s);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
  }

  setPreset(p: Preset) {
    this.preset.set(p);
    this.range.set(p === 'week' ? weekRange() : monthRange());
  }

  setFrom(from: string) { this.preset.set('custom'); this.range.update(r => ({ ...r, from })); }
  setTo(to: string)     { this.preset.set('custom'); this.range.update(r => ({ ...r, to })); }
}
