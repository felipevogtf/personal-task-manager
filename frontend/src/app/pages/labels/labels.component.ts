import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { LabelsService } from '../../core/services/labels.service';
import { Label } from '../../models';

@Component({
  selector: 'app-labels',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col">

      <header class="page-header">
        <h1 class="page-title">Etiquetas</h1>
        <button class="btn-primary ml-auto" (click)="startCreate()">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
          </svg>
          Nueva etiqueta
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
              placeholder="Nombre de la etiqueta"
              autofocus
            />
            <label class="color-picker-wrap">
              <span class="color-swatch" [style.background]="editing()!.color"></span>
              <input type="color" [value]="editing()!.color" (input)="patch('color', $any($event.target).value)" class="color-input" />
            </label>
            <div class="flex items-center gap-2 ml-auto">
              <button class="btn" (click)="editing.set(null)">Cancelar</button>
              <button class="btn-primary" (click)="save()">Crear</button>
            </div>
          </div>
        }

        <!-- Lista de etiquetas -->
        <div class="bg-surface border border-line rounded-xl overflow-hidden">
          @for (label of labelsResource.value(); track label.id; let last = $last) {
            <div class="flex items-center gap-3 px-4 py-3" [class.border-b]="!last" [style.border-color]="'var(--color-line-soft)'">

              @if (editing()?.id === label.id) {
                <input
                  class="field-input max-w-[180px]"
                  [value]="editing()!.name"
                  (input)="patch('name', $any($event.target).value)"
                />
                <label class="color-picker-wrap">
                  <span class="color-swatch" [style.background]="editing()!.color"></span>
                  <input type="color" [value]="editing()!.color" (input)="patch('color', $any($event.target).value)" class="color-input" />
                </label>
                <div class="flex items-center gap-2 ml-auto">
                  <button class="btn" (click)="editing.set(null)">Cancelar</button>
                  <button class="btn-primary" (click)="save()">Guardar</button>
                </div>
              } @else {
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-white"
                  [style.background]="label.color">
                  {{ label.name }}
                </span>
                <div class="ml-auto flex items-center gap-1.5">
                  <button class="btn-ghost" (click)="startEdit(label)">Editar</button>
                  <button class="btn-danger" (click)="remove(label)">Eliminar</button>
                </div>
              }

            </div>
          }

          @if (!labelsResource.value()?.length && !labelsResource.isLoading()) {
            <div class="py-10 text-center text-[12px] text-ghost">
              Sin etiquetas. Crea una para comenzar.
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
export class LabelsComponent {
  private readonly labelsService = inject(LabelsService);

  readonly labelsResource = rxResource<Label[], undefined>({ stream: () => this.labelsService.getAll() });
  readonly editing = signal<Partial<Label> | null>(null);

  patch(key: string, value: unknown) {
    this.editing.update(e => e ? { ...e, [key]: value } : e);
  }

  startCreate() { this.editing.set({ name: '', color: '#6366f1' }); }
  startEdit(label: Label) { this.editing.set({ ...label }); }

  async save() {
    const e = this.editing();
    if (!e) return;
    await lastValueFrom(e.id ? this.labelsService.update(e.id, e) : this.labelsService.create(e));
    this.labelsResource.reload();
    this.editing.set(null);
  }

  async remove(label: Label) {
    if (!confirm(`¿Eliminar la etiqueta "${label.name}"?`)) return;
    await lastValueFrom(this.labelsService.remove(label.id));
    this.labelsResource.reload();
  }
}
