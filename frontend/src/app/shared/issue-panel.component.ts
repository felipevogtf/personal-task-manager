import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { IssuesService } from '../core/services/issues.service';
import { StatesService } from '../core/services/states.service';
import { LabelsService } from '../core/services/labels.service';
import { TimeEntriesService } from '../core/services/time-entries.service';
import { Issue, Label, State, TimeEntry } from '../models';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high:   'Alta',
  medium: 'Media',
  low:    'Baja',
  none:   'Sin prioridad',
};

@Component({
  selector: 'app-issue-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>

    <aside class="panel">

      <!-- Cabecera -->
      <div class="flex items-center gap-3 h-[52px] px-5 border-b border-line flex-shrink-0">
        <span class="text-[11px] font-mono text-ghost">
          {{ issue().project.identifier }}-{{ issue().is_local ? 'L' + issue().local_id : issue().sequence_id }}
        </span>
        <div class="ml-auto flex items-center gap-1">
          @if (issue().is_local) {
            <button class="close-btn hover:text-bad hover:bg-red-50" title="Eliminar tarea" (click)="deleteIssue()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          }
          <button class="close-btn" (click)="closed.emit()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M1 1l12 12M13 1L1 13"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Cuerpo -->
      <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

        <!-- Título + descripción -->
        <div class="flex flex-col gap-2">
          @if (issue().is_local) {
            <input
              type="text"
              class="field-input text-[15px] font-semibold w-full"
              [value]="issue().name"
              (blur)="saveField('name', $any($event.target).value)"
              (keydown.enter)="$any($event.target).blur()" />
            <textarea
              class="field-input w-full text-[13px] resize-none"
              rows="4"
              placeholder="Descripción…"
              [value]="issue().description ?? ''"
              (blur)="saveField('description', $any($event.target).value || null)">
            </textarea>
          } @else {
            <h2 class="text-[15px] font-semibold text-on leading-snug">{{ issue().name }}</h2>
            @if (safeDescription()) {
              <div class="description-html" [innerHTML]="safeDescription()"></div>
            } @else {
              <p class="text-[12.5px] text-ghost italic">Sin descripción</p>
            }
          }
        </div>

        <!-- Propiedades -->
        <div class="border border-line rounded-xl overflow-hidden">

          <!-- Estado -->
          <div class="prop-row border-b border-line-soft">
            <span class="prop-label">Estado</span>
            <div class="flex-1">
              <select
                class="field-select w-full text-[12px]"
                (change)="changeState($any($event.target).value)">
                <option value="" [selected]="!issue().state">Sin estado</option>
                @for (s of statesResource.value(); track s.id) {
                  <option [value]="s.id" [selected]="issue().state?.id === s.id">{{ s.name }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Prioridad -->
          <div class="prop-row border-b border-line-soft">
            <span class="prop-label">Prioridad</span>
            @if (issue().is_local) {
              <select class="field-select text-[12px]" [value]="issue().priority" (change)="saveField('priority', $any($event.target).value)">
                <option value="none">Sin prioridad</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            } @else {
              <div class="flex items-center gap-2">
                <span class="p-dot p-dot-{{ issue().priority }}"></span>
                <span class="text-[12.5px] text-dim">{{ priorityLabel(issue().priority) }}</span>
              </div>
            }
          </div>

          <!-- Proyecto -->
          <div class="prop-row">
            <span class="prop-label">Proyecto</span>
            <span class="text-[12.5px] text-dim">{{ issue().project.name }}</span>
          </div>

        </div>

        <!-- Fechas y horas -->
        <div class="border border-line rounded-xl overflow-hidden">

          <div class="prop-row border-b border-line-soft">
            <span class="prop-label">Inicio</span>
            <input
              type="date"
              class="field-input text-[12px]"
              [value]="issue().start_date ?? ''"
              (change)="saveDates({ start_date: $any($event.target).value || null })"
            />
          </div>

          <div class="prop-row">
            <span class="prop-label">Fecha límite</span>
            <input
              type="date"
              class="field-input text-[12px]"
              [value]="issue().due_date ?? ''"
              (change)="saveDates({ due_date: $any($event.target).value || null })"
            />
          </div>

        </div>

        <!-- Tiempo trabajado -->
        <div class="border border-line rounded-xl overflow-hidden">

          <div class="px-4 py-2.5 border-b border-line-soft flex items-center justify-between">
            <p class="text-[10.5px] font-semibold text-ghost uppercase tracking-widest">Tiempo trabajado</p>
            @if (totalHours() > 0) {
              <span class="text-[12px] font-semibold text-tint">{{ totalHours() }}h total</span>
            }
          </div>

          @for (entry of timeEntriesResource.value(); track entry.id) {
            <div class="prop-row border-b border-line-soft">
              <span class="text-[12px] text-dim flex-1">{{ entry.date }}</span>
              <span class="text-[12.5px] font-semibold text-on mr-2">{{ +entry.hours }}h</span>
              <button class="close-btn" title="Eliminar" (click)="removeEntry(entry.id)">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M1 1l12 12M13 1L1 13"/>
                </svg>
              </button>
            </div>
          }

          @if (!timeEntriesResource.value()?.length) {
            <p class="text-[12px] text-ghost px-4 py-3 italic">Sin registros aún</p>
          }

          <!-- Agregar entrada -->
          <div class="px-3 py-2.5 border-t border-line-soft flex gap-2 items-center">
            <input
              type="date"
              class="field-input text-[12px] flex-1"
              [value]="newDate()"
              (change)="newDate.set($any($event.target).value)"
            />
            <input
              type="number"
              min="0.5"
              step="0.5"
              class="field-input text-[12px] w-[64px]"
              placeholder="h"
              [value]="newHours() ?? ''"
              (input)="newHours.set($any($event.target).value ? +$any($event.target).value : null)"
            />
            <button
              class="btn btn-primary text-[12px] px-3 h-[30px]"
              [disabled]="!newDate() || !newHours()"
              (click)="addEntry()"
            >+</button>
          </div>

        </div>

        <!-- Etiquetas -->
        <div>
          <p class="text-[10.5px] font-semibold text-ghost uppercase tracking-widest mb-2.5">Etiquetas</p>
          <div class="flex flex-col gap-1">
            @for (label of labelsResource.value(); track label.id) {
              <label class="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-raised cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  [checked]="hasLabel(label.id)"
                  (change)="toggleLabel(label.id)"
                  class="w-3.5 h-3.5 rounded border border-line bg-base accent-tint cursor-pointer"
                />
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                  [style.background]="label.color">
                  {{ label.name }}
                </span>
              </label>
            }
            @if (!labelsResource.value()?.length) {
              <p class="text-[12px] text-ghost px-3">Sin etiquetas configuradas</p>
            }
          </div>
        </div>

      </div>
    </aside>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      justify-content: flex-end;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(17, 17, 24, 0.2);
    }

    .panel {
      position: relative;
      width: 540px;
      max-width: 95vw;
      background: var(--color-surface);
      border-left: 1px solid var(--color-line-soft);
      box-shadow: -12px 0 40px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: panel-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes panel-in {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--color-ghost);
      cursor: pointer;
      transition: color 0.12s, background 0.12s;
    }
    .close-btn:hover {
      color: var(--color-on);
      background: var(--color-raised);
    }

    .prop-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 14px;
    }
    .prop-label {
      width: 96px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-ghost);
    }

    .description-html {
      font-size: 13px;
      color: var(--color-dim);
      line-height: 1.7;
      max-height: 180px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .description-html p { margin-bottom: 0.65em; }
    .description-html p:last-child { margin-bottom: 0; }
    .description-html ul, .description-html ol { padding-left: 1.25em; margin-bottom: 0.65em; }
    .description-html li { margin-bottom: 0.2em; }
    .description-html strong { font-weight: 600; color: var(--color-on); }
    .description-html em { font-style: italic; }
    .description-html h1, .description-html h2, .description-html h3 {
      color: var(--color-on);
      font-weight: 600;
      margin: 0.9em 0 0.4em;
    }
    .description-html h1 { font-size: 15px; }
    .description-html h2 { font-size: 14px; }
    .description-html h3 { font-size: 13px; }
    .description-html code {
      font-family: ui-monospace, monospace;
      font-size: 11.5px;
      background: var(--color-raised);
      border: 1px solid var(--color-line);
      padding: 1px 5px;
      border-radius: 3px;
      color: var(--color-on);
    }
    .description-html pre {
      background: var(--color-raised);
      border: 1px solid var(--color-line);
      border-radius: 6px;
      padding: 10px 12px;
      overflow-x: auto;
      margin-bottom: 0.65em;
    }
    .description-html pre code { background: none; border: none; padding: 0; }
    .description-html blockquote {
      border-left: 3px solid var(--color-line);
      padding-left: 12px;
      color: var(--color-ghost);
      margin: 0.65em 0;
    }
    .description-html a { color: var(--color-tint); text-decoration: underline; }
  `],
})
export class IssuePanelComponent {
  private readonly issuesService = inject(IssuesService);
  private readonly statesService = inject(StatesService);
  private readonly labelsService = inject(LabelsService);
  private readonly timeEntriesService = inject(TimeEntriesService);
  private readonly sanitizer = inject(DomSanitizer);

  issue = input.required<Issue>();

  readonly safeDescription = computed<SafeHtml | null>(() => {
    const desc = this.issue().description;
    return desc ? this.sanitizer.bypassSecurityTrustHtml(desc) : null;
  });
  closed = output();
  changed = output<Issue>();
  deleted = output();

  readonly statesResource = rxResource<State[], undefined>({ stream: () => this.statesService.getAll() });
  readonly labelsResource = rxResource<Label[], undefined>({ stream: () => this.labelsService.getAll() });

  readonly timeEntriesResource = rxResource<TimeEntry[], string>({
    params: () => this.issue().id,
    stream: ({ params: issueId }) => this.timeEntriesService.getByIssue(issueId),
  });

  readonly totalHours = computed(() =>
    (this.timeEntriesResource.value() ?? []).reduce((sum, e) => sum + Number(e.hours), 0),
  );

  readonly newDate = signal(new Date().toISOString().split('T')[0]);
  readonly newHours = signal<number | null>(null);

  hasLabel(labelId: string) {
    return this.issue().labels.some(l => l.id === labelId);
  }

  priorityLabel(priority: string): string {
    return PRIORITY_LABELS[priority] ?? priority;
  }

  async deleteIssue() {
    await lastValueFrom(this.issuesService.remove(this.issue().id));
    this.deleted.emit();
    this.closed.emit();
  }

  async saveField(field: 'name' | 'description' | 'priority', value: string | null) {
    if (field === 'name' && !value?.trim()) return;
    const updated = await lastValueFrom(this.issuesService.update(this.issue().id, { [field]: value }));
    if (updated) this.changed.emit(updated);
  }

  async changeState(stateId: string) {
    const updated = await lastValueFrom(this.issuesService.setState(this.issue().id, stateId || null));
    if (updated) this.changed.emit(updated);
  }

  async toggleLabel(labelId: string) {
    const current = this.issue().labels.map(l => l.id);
    const next = current.includes(labelId)
      ? current.filter(id => id !== labelId)
      : [...current, labelId];
    const updated = await lastValueFrom(this.issuesService.assignLabels(this.issue().id, next));
    if (updated) this.changed.emit(updated);
  }

  async saveDates(data: { start_date?: string | null; due_date?: string | null; hours_worked?: number | null }) {
    const updated = await lastValueFrom(this.issuesService.update(this.issue().id, data));
    if (updated) this.changed.emit(updated);
  }

  async addEntry() {
    const date = this.newDate();
    const hours = this.newHours();
    if (!date || !hours) return;
    await lastValueFrom(this.timeEntriesService.create(this.issue().id, { date, hours }));
    this.newHours.set(null);
    this.timeEntriesResource.reload();
  }

  async removeEntry(id: string) {
    await lastValueFrom(this.timeEntriesService.remove(id));
    this.timeEntriesResource.reload();
  }
}
