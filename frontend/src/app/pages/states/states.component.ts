import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { StatesService } from '../../core/services/states.service';
import { State } from '../../models';

@Component({
  selector: 'app-states',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col">

      <header class="page-header">
        <h1 class="page-title">Estados</h1>
        <button class="btn-primary ml-auto" (click)="startCreate()">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
          </svg>
          Nuevo estado
        </button>
      </header>

      <div class="page-body">

        <!-- Formulario de creación -->
        @if (editing() && !editing()!.id) {
          <div class="bg-surface border border-line rounded-xl p-4 mb-4 flex items-center gap-2.5 flex-wrap">
            <input
              class="field-input max-w-[200px]"
              [value]="editing()!.name"
              (input)="patch('name', $any($event.target).value)"
              placeholder="Nombre del estado"
              autofocus
            />
            <label class="color-picker-wrap">
              <span class="color-swatch" [style.background]="editing()!.color"></span>
              <input type="color" [value]="editing()!.color" (input)="patch('color', $any($event.target).value)" class="color-input" />
            </label>
            <input
              class="field-input w-[80px]"
              type="number"
              [value]="editing()!.position"
              (input)="patch('position', +$any($event.target).value)"
              placeholder="Posición"
            />
            <div class="flex items-center gap-2 ml-auto">
              <button class="btn" (click)="editing.set(null)">Cancelar</button>
              <button class="btn-primary" (click)="save()">Crear</button>
            </div>
          </div>
        }

        <!-- Lista de estados -->
        <div class="bg-surface border border-line rounded-xl overflow-hidden">
          @for (state of statesResource.value(); track state.id; let last = $last) {
            <div class="flex items-center gap-3 px-4 py-3" [class.border-b]="!last" [style.border-color]="'var(--color-line-soft)'">

              @if (editing()?.id === state.id) {
                <div class="w-3 h-3 rounded-full flex-shrink-0" [style.background]="editing()!.color ?? state.color"></div>
                <input
                  class="field-input max-w-[180px]"
                  [value]="editing()!.name"
                  (input)="patch('name', $any($event.target).value)"
                />
                <label class="color-picker-wrap">
                  <span class="color-swatch" [style.background]="editing()!.color"></span>
                  <input type="color" [value]="editing()!.color" (input)="patch('color', $any($event.target).value)" class="color-input" />
                </label>
                <input
                  class="field-input w-[72px]"
                  type="number"
                  [value]="editing()!.position"
                  (input)="patch('position', +$any($event.target).value)"
                />
                <div class="flex items-center gap-2 ml-auto">
                  <button class="btn" (click)="editing.set(null)">Cancelar</button>
                  <button class="btn-primary" (click)="save()">Guardar</button>
                </div>
              } @else {
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" [style.background]="state.color"></div>
                <span class="text-[13px] text-on flex-1">{{ state.name }}</span>
                <span class="text-[11px] text-ghost font-mono">#{{ state.position }}</span>
                <button class="btn-ghost" (click)="startEdit(state)">Editar</button>
                <button class="btn-danger" (click)="remove(state)">Eliminar</button>
              }

            </div>
          }

          @if (!statesResource.value()?.length && !statesResource.isLoading()) {
            <div class="py-10 text-center text-[12px] text-ghost">
              Sin estados. Crea uno para comenzar.
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .color-picker-wrap {
      position: relative;
      display: inline-flex;
      cursor: pointer;
    }
    .color-swatch {
      display: block;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      border: 1px solid var(--color-line);
      flex-shrink: 0;
    }
    .color-input {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      overflow: hidden;
    }
  `],
})
export class StatesComponent {
  private readonly statesService = inject(StatesService);

  readonly statesResource = rxResource<State[], undefined>({ stream: () => this.statesService.getAll() });
  readonly editing = signal<Partial<State> | null>(null);

  patch(key: string, value: unknown) {
    this.editing.update(e => e ? { ...e, [key]: value } : e);
  }

  startCreate() {
    this.editing.set({ name: '', color: '#6366f1', position: this.statesResource.value()?.length ?? 0 });
  }

  startEdit(state: State) { this.editing.set({ ...state }); }

  async save() {
    const e = this.editing();
    if (!e) return;
    await lastValueFrom(e.id ? this.statesService.update(e.id, e) : this.statesService.create(e));
    this.statesResource.reload();
    this.editing.set(null);
  }

  async remove(state: State) {
    if (!confirm(`¿Eliminar el estado "${state.name}"?`)) return;
    await lastValueFrom(this.statesService.remove(state.id));
    this.statesResource.reload();
  }
}
