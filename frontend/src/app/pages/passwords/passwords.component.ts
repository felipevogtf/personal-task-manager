import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { PasswordsService } from '../../core/services/passwords.service';
import { Password, PasswordField } from '../../models';

interface NewFieldForm { key: string; value: string; is_sensitive: boolean; }
interface NewEntryForm { name: string; type: 'single' | 'group'; category: string; fields: NewFieldForm[]; }

@Component({
  selector: 'app-passwords',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full">

      <header class="page-header">
        <h1 class="page-title">Contraseñas</h1>
        <div class="ml-auto flex items-center gap-2">
          <button class="btn" (click)="openCreate('single')">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
            </svg>
            Agregar clave
          </button>
          <button class="btn-primary" (click)="openCreate('group')">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
            </svg>
            Agregar grupo
          </button>
        </div>
      </header>

      <!-- Formulario clave individual -->
      @if (creatingMode() === 'single') {
        <div class="border-b border-line-soft bg-surface flex-shrink-0 px-6 py-4 flex flex-col gap-3">
          <p class="text-[12px] font-semibold text-ghost uppercase tracking-widest">Nueva clave</p>
          <div class="flex items-center gap-2.5 flex-wrap">
            <input
              type="text"
              class="field-input w-[200px]"
              placeholder="Etiqueta… (ej: Token API)"
              [value]="newEntry().name"
              (input)="patchEntry('name', $any($event.target).value)" />
            <input
              [type]="newEntry().fields[0]?.is_sensitive ? 'password' : 'text'"
              class="field-input flex-1 min-w-[200px]"
              placeholder="Valor…"
              [value]="newEntry().fields[0]?.value"
              (input)="patchNewField(0, 'value', $any($event.target).value)" />
            <label class="flex items-center gap-1.5 text-[12px] text-ghost cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox"
                [checked]="newEntry().fields[0]?.is_sensitive"
                (change)="patchNewField(0, 'is_sensitive', !newEntry().fields[0]?.is_sensitive)"
                class="accent-tint" />
              Sensible
            </label>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn" (click)="cancelCreate()">Cancelar</button>
            <button class="btn-primary"
              [disabled]="!newEntry().name.trim() || !newEntry().fields[0]?.value || saving()"
              (click)="submitCreate()">
              {{ saving() ? 'Guardando…' : 'Crear' }}
            </button>
          </div>
        </div>
      }

      <!-- Formulario grupo -->
      @if (creatingMode() === 'group') {
        <div class="border-b border-line-soft bg-surface flex-shrink-0 px-6 py-4 flex flex-col gap-3">
          <p class="text-[12px] font-semibold text-ghost uppercase tracking-widest">Nuevo grupo</p>
          <div class="flex items-center gap-2.5 flex-wrap">
            <input
              type="text"
              class="field-input flex-1 min-w-[200px]"
              placeholder="Nombre del grupo… (ej: Melon, aws-melon)"
              [value]="newEntry().name"
              (input)="patchEntry('name', $any($event.target).value)" />
            <input
              type="text"
              class="field-input w-[160px]"
              placeholder="Categoría (opcional)"
              [value]="newEntry().category"
              (input)="patchEntry('category', $any($event.target).value)" />
          </div>

          <div class="flex flex-col gap-2">
            @for (field of newEntry().fields; track $index; let i = $index) {
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  class="field-input w-[160px] flex-shrink-0"
                  placeholder="Clave…"
                  [value]="field.key"
                  (input)="patchNewField(i, 'key', $any($event.target).value)" />
                <input
                  [type]="field.is_sensitive ? 'password' : 'text'"
                  class="field-input flex-1"
                  placeholder="Valor…"
                  [value]="field.value"
                  (input)="patchNewField(i, 'value', $any($event.target).value)" />
                <label class="flex items-center gap-1.5 text-[11.5px] text-ghost cursor-pointer select-none whitespace-nowrap">
                  <input type="checkbox" [checked]="field.is_sensitive" (change)="patchNewField(i, 'is_sensitive', !field.is_sensitive)" class="accent-tint" />
                  Sensible
                </label>
                <button class="icon-btn" (click)="removeNewField(i)">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </button>
              </div>
            }
            <button class="self-start btn text-[12px]" (click)="addNewField()">+ Agregar campo</button>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn" (click)="cancelCreate()">Cancelar</button>
            <button class="btn-primary"
              [disabled]="!newEntry().name.trim() || !newEntry().fields.length || saving()"
              (click)="submitCreate()">
              {{ saving() ? 'Guardando…' : 'Crear' }}
            </button>
          </div>
        </div>
      }

      <!-- Lista -->
      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-3">

        @if (passwordsResource.isLoading()) {
          <div class="flex items-center gap-2 text-[12.5px] text-ghost">
            <span class="w-3.5 h-3.5 rounded-full border-2 border-ghost/30 border-t-ghost animate-spin"></span>
            Cargando…
          </div>
        }

        @for (entry of passwords(); track entry.id) {

          @if (entry.type === 'single') {
            <!-- Single: fila inline -->
            <div class="bg-surface border border-line rounded-xl flex items-center group">
              <div class="flex items-center gap-1 px-4 py-3 w-[180px] flex-shrink-0 border-r border-line-soft group/key">
                <span class="text-[13px] font-medium text-dim flex-1">{{ entry.name }}</span>
                <button class="icon-btn opacity-0 group-hover/key:opacity-100 !w-[20px] !h-[20px]" title="Copiar llave" (click)="copyText(entry.name)">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                    <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>
                  </svg>
                </button>
              </div>
              @for (field of entry.fields; track field.id) {
                <div class="flex items-center gap-2 flex-1 px-4 py-3">
                  <span class="text-[13px] text-on flex-1 font-mono">
                    {{ field.is_sensitive ? (revealedValues().get(field.id) ?? '••••••••') : field.value_enc }}
                  </span>
                  @if (field.is_sensitive) {
                    <button class="icon-btn" title="Mostrar" (click)="toggleReveal(entry.id, field)">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        @if (revealedValues().has(field.id)) {
                          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/>
                          <path d="M2 2l12 12" stroke-linecap="round"/>
                        } @else {
                          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/>
                        }
                      </svg>
                    </button>
                  }
                  <button class="icon-btn" title="Copiar" (click)="copyField(entry.id, field)">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                      <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>
                    </svg>
                  </button>
                </div>
              }
              <div class="flex items-center gap-1 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="icon-btn" title="Editar" (click)="startEdit(entry)">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 2l3 3-9 9H2v-3l9-9z"/>
                  </svg>
                </button>
                <button class="icon-btn text-bad" title="Eliminar" (click)="deleteEntry(entry.id)">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
                  </svg>
                </button>
              </div>
            </div>
          }

          @if (entry.type === 'group') {
            <!-- Group: colapsable -->
            <div class="bg-surface border border-line rounded-xl overflow-hidden">

              <!-- Cabecera -->
              <div class="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none group"
                   (click)="toggleCollapse(entry.id)">
                <svg
                  class="flex-shrink-0 text-ghost transition-transform duration-150"
                  [style.transform]="collapsed().has(entry.id) ? 'rotate(-90deg)' : 'rotate(0deg)'"
                  width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 4l4 4 4-4"/>
                </svg>
                <span class="text-[13px] font-semibold text-on flex-1">{{ entry.name }}</span>
                @if (entry.category) {
                  <span class="text-[11px] text-ghost bg-raised border border-line-soft px-2 py-0.5 rounded-full">{{ entry.category }}</span>
                }
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" (click)="$event.stopPropagation()">
                  <button class="icon-btn" title="Editar nombre" (click)="startEdit(entry)">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 2l3 3-9 9H2v-3l9-9z"/>
                    </svg>
                  </button>
                  <button class="icon-btn text-bad" title="Eliminar" (click)="deleteEntry(entry.id)">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
                    </svg>
                  </button>
                </div>
              </div>

              @if (!collapsed().has(entry.id)) {
                <div class="border-t border-line-soft divide-y divide-line-soft">

                  @for (field of sortedFields(entry); track field.id) {
                    <div class="flex items-center group/row">
                      <div class="flex items-center gap-1 px-4 py-2.5 w-[160px] flex-shrink-0 border-r border-line-soft group/key">
                        <span class="text-[12px] text-ghost font-medium flex-1">{{ field.key }}</span>
                        <button class="icon-btn opacity-0 group-hover/key:opacity-100 !w-[20px] !h-[20px]" title="Copiar llave" (click)="copyText(field.key)">
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                            <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>
                          </svg>
                        </button>
                      </div>
                      <div class="flex items-center gap-2 flex-1 px-4 py-2.5">
                        <span class="text-[13px] text-on flex-1 font-mono break-all">
                          {{ field.is_sensitive ? (revealedValues().get(field.id) ?? '••••••••') : field.value_enc }}
                        </span>
                        @if (field.is_sensitive) {
                          <button class="icon-btn opacity-0 group-hover/row:opacity-100" title="Mostrar" (click)="toggleReveal(entry.id, field)">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                              @if (revealedValues().has(field.id)) {
                                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/>
                                <path d="M2 2l12 12" stroke-linecap="round"/>
                              } @else {
                                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/>
                              }
                            </svg>
                          </button>
                        }
                        <button class="icon-btn opacity-0 group-hover/row:opacity-100" title="Copiar" (click)="copyField(entry.id, field)">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                            <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>
                          </svg>
                        </button>
                        <button class="icon-btn opacity-0 group-hover/row:opacity-100 text-bad" title="Eliminar campo" (click)="deleteField(entry.id, field.id)">
                          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                            <path d="M1 1l8 8M9 1L1 9"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }

                  <!-- Inline add field -->
                  @if (addingFieldTo() === entry.id) {
                    <div class="flex items-center gap-2 px-4 py-2.5 bg-raised">
                      <input type="text" class="field-input w-[150px] flex-shrink-0 text-[12px]"
                        placeholder="Clave…"
                        [value]="inlineField().key"
                        (input)="patchInline('key', $any($event.target).value)" />
                      <input [type]="inlineField().is_sensitive ? 'password' : 'text'"
                        class="field-input flex-1 text-[12px]"
                        placeholder="Valor…"
                        [value]="inlineField().value"
                        (input)="patchInline('value', $any($event.target).value)"
                        (keydown.enter)="submitInlineField(entry.id)" />
                      <label class="flex items-center gap-1 text-[11px] text-ghost cursor-pointer select-none whitespace-nowrap">
                        <input type="checkbox" [checked]="inlineField().is_sensitive" (change)="patchInline('is_sensitive', !inlineField().is_sensitive)" class="accent-tint" />
                        Sensible
                      </label>
                      <button class="btn text-[11px] px-2 py-1" (click)="addingFieldTo.set(null)">Cancelar</button>
                      <button class="btn-primary text-[11px] px-2 py-1"
                        [disabled]="!inlineField().key.trim() || !inlineField().value.trim()"
                        (click)="submitInlineField(entry.id)">Agregar</button>
                    </div>
                  } @else {
                    <button
                      class="w-full text-left px-4 py-2.5 text-[12px] text-ghost hover:text-dim hover:bg-raised transition-colors"
                      (click)="startAddField(entry.id)">
                      + Agregar campo
                    </button>
                  }
                </div>
              }
            </div>
          }
        }

        @if (!passwordsResource.isLoading() && !passwords().length) {
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-10 h-10 rounded-xl bg-raised flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-ghost">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p class="text-[14px] font-semibold text-on mb-1">Sin entradas</p>
            <p class="text-[12.5px] text-ghost">Creá tu primera contraseña o grupo</p>
          </div>
        }

      </div>
    </div>

    <!-- Toast copiar -->
    @if (copied()) {
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-on text-base text-[12.5px] font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none z-50">
        Copiado al portapapeles
      </div>
    }

    <!-- Modal editar entrada -->
    @if (editEntry(); as entry) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
           (mousedown)="onEditBackdropMousedown($event)"
           (click)="onEditBackdropClick($event)">
        <div class="bg-surface border border-line rounded-2xl shadow-xl p-6 w-[480px] flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          <h2 class="text-[14px] font-semibold text-on">Editar entrada</h2>

          <input type="text" class="field-input" placeholder="Nombre…"
            [value]="editName()"
            (input)="editName.set($any($event.target).value)" />

          @if (entry.type === 'group') {
            <input type="text" class="field-input" placeholder="Categoría (opcional)"
              [value]="editCategory()"
              (input)="editCategory.set($any($event.target).value)" />

            @if (entry.fields.length) {
              <div class="flex flex-col gap-0 border border-line rounded-xl overflow-hidden">
                <p class="px-3 py-2 text-[10.5px] font-semibold text-ghost uppercase tracking-widest border-b border-line-soft bg-raised">
                  Cambiar valores (dejá vacío para no modificar)
                </p>
                @for (field of sortedFields(entry); track field.id) {
                  <div class="flex items-center border-b border-line-soft last:border-0">
                    <span class="px-3 py-2.5 text-[12px] text-ghost font-medium w-[140px] flex-shrink-0 border-r border-line-soft">
                      {{ field.key }}
                    </span>
                    <input
                      type="password"
                      class="flex-1 bg-transparent text-[12.5px] text-on px-3 py-2.5 outline-none placeholder:text-ghost/50 border-r border-line-soft"
                      placeholder="Nuevo valor…"
                      [value]="editFieldValues().get(field.id) ?? ''"
                      (input)="patchEditField(field.id, $any($event.target).value)" />
                    <label class="flex items-center gap-1.5 px-3 text-[11.5px] cursor-pointer select-none whitespace-nowrap"
                      [class.text-bad]="field.is_sensitive && !(editFieldSensitive().get(field.id) ?? field.is_sensitive) && !(editFieldValues().get(field.id) ?? '')"
                      [class.text-ghost]="!(field.is_sensitive && !(editFieldSensitive().get(field.id) ?? field.is_sensitive) && !(editFieldValues().get(field.id) ?? ''))">
                      <input type="checkbox"
                        [checked]="editFieldSensitive().get(field.id) ?? field.is_sensitive"
                        (change)="toggleEditSensitive(field.id)"
                        class="accent-tint" />
                      Sensible
                    </label>
                  </div>
                }
              </div>
            }
          }

          @if (entry.type === 'single' && entry.fields[0]) {
            <div class="flex flex-col gap-2 border border-line rounded-xl overflow-hidden">
              <p class="px-3 py-2 text-[10.5px] font-semibold text-ghost uppercase tracking-widest border-b border-line-soft bg-raised">
                Cambiar valor (dejá vacío para no modificar)
              </p>
              <div class="flex items-center border-b border-line-soft">
                <input
                  type="password"
                  class="flex-1 bg-transparent text-[12.5px] text-on px-3 py-2.5 outline-none placeholder:text-ghost/50 border-r border-line-soft"
                  placeholder="Nuevo valor…"
                  [value]="editFieldValues().get(entry.fields[0].id) ?? ''"
                  (input)="patchEditField(entry.fields[0].id, $any($event.target).value)" />
                <label class="flex items-center gap-1.5 px-3 text-[11.5px] text-ghost cursor-pointer select-none whitespace-nowrap">
                  <input type="checkbox"
                    [checked]="editFieldSensitive().get(entry.fields[0].id) ?? entry.fields[0].is_sensitive"
                    (change)="toggleEditSensitive(entry.fields[0].id)"
                    class="accent-tint" />
                  Sensible
                </label>
              </div>
              @if ((editFieldSensitive().get(entry.fields[0].id) ?? entry.fields[0].is_sensitive) === false && entry.fields[0].is_sensitive) {
                <p class="px-3 pb-2.5 text-[11px] text-bad">Al desmarcar "Sensible" el valor actual se borrará. Ingresá un nuevo valor si querés conservarlo.</p>
              }
            </div>
          }

          <div class="flex gap-2 justify-end">
            <button class="btn" (click)="editEntry.set(null)">Cancelar</button>
            <button class="btn-primary" (click)="submitEdit()">Guardar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .icon-btn {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 6px;
      border: none; background: transparent;
      color: var(--color-ghost); cursor: pointer;
      transition: color 0.1s, background 0.1s;
      flex-shrink: 0;
    }
    .icon-btn:hover { color: var(--color-dim); background: var(--color-raised); }
    .icon-btn.text-bad:hover { color: var(--color-bad); }
    .text-bad { color: var(--color-bad); }
  `],
})
export class PasswordsComponent {
  private readonly svc = inject(PasswordsService);

  readonly passwordsResource = rxResource<Password[], undefined>({ stream: () => this.svc.getAll() });
  readonly passwords = computed(() => this.passwordsResource.value() ?? []);

  readonly collapsed = signal<Set<string>>(new Set());
  readonly revealedValues = signal<Map<string, string>>(new Map());
  readonly copied = signal(false);

  readonly creatingMode = signal<'single' | 'group' | null>(null);
  readonly saving = signal(false);
  readonly newEntry = signal<NewEntryForm>({ name: '', type: 'group', category: '', fields: [] });

  readonly addingFieldTo = signal<string | null>(null);
  readonly inlineField = signal<{ key: string; value: string; is_sensitive: boolean }>({ key: '', value: '', is_sensitive: false });

  readonly editEntry = signal<Password | null>(null);
  readonly editName = signal('');
  readonly editCategory = signal('');
  readonly editFieldValues = signal<Map<string, string>>(new Map());
  readonly editFieldSensitive = signal<Map<string, boolean>>(new Map());
  private _editMousedownOnBackdrop = false;

  toggleCollapse(id: string) {
    this.collapsed.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  sortedFields(entry: Password): PasswordField[] {
    return [...entry.fields].sort((a, b) => a.sort_order - b.sort_order);
  }

  openCreate(mode: 'single' | 'group') {
    const fields = mode === 'single' ? [{ key: '', value: '', is_sensitive: false }] : [];
    this.newEntry.set({ name: '', type: mode, category: '', fields });
    this.creatingMode.set(mode);
  }

  cancelCreate() {
    this.creatingMode.set(null);
    this.newEntry.set({ name: '', type: 'group', category: '', fields: [] });
  }

  patchEntry<K extends keyof NewEntryForm>(key: K, value: NewEntryForm[K]) {
    this.newEntry.update(e => ({ ...e, [key]: value }));
  }

  addNewField() {
    this.newEntry.update(e => ({ ...e, fields: [...e.fields, { key: '', value: '', is_sensitive: false }] }));
  }

  removeNewField(i: number) {
    this.newEntry.update(e => ({ ...e, fields: e.fields.filter((_, idx) => idx !== i) }));
  }

  patchNewField(i: number, key: keyof NewFieldForm, value: any) {
    this.newEntry.update(e => {
      const fields = [...e.fields];
      fields[i] = { ...fields[i], [key]: value };
      return { ...e, fields };
    });
  }

  async submitCreate() {
    const e = this.newEntry();
    if (!e.name.trim() || !e.fields.length) return;
    this.saving.set(true);
    try {
      await lastValueFrom(this.svc.create({
        name: e.name.trim(),
        type: e.type,
        category: e.category.trim() || undefined,
        fields: e.fields.map((f, i) => ({ key: f.key.trim() || undefined, value: f.value, is_sensitive: f.is_sensitive, sort_order: i })),
      }));
      this.passwordsResource.reload();
      this.cancelCreate();
    } finally {
      this.saving.set(false);
    }
  }

  startAddField(entryId: string) {
    this.addingFieldTo.set(entryId);
    this.inlineField.set({ key: '', value: '', is_sensitive: false });
  }

  patchInline(key: 'key' | 'value' | 'is_sensitive', value: any) {
    this.inlineField.update(f => ({ ...f, [key]: value }));
  }

  async submitInlineField(entryId: string) {
    const f = this.inlineField();
    if (!f.key.trim() || !f.value.trim()) return;
    await lastValueFrom(this.svc.addField(entryId, { key: f.key.trim(), value: f.value, is_sensitive: f.is_sensitive }));
    this.passwordsResource.reload();
    this.addingFieldTo.set(null);
  }

  async deleteField(entryId: string, fieldId: string) {
    await lastValueFrom(this.svc.removeField(entryId, fieldId));
    this.passwordsResource.reload();
  }

  async deleteEntry(id: string) {
    await lastValueFrom(this.svc.remove(id));
    this.passwordsResource.reload();
  }

  async toggleReveal(entryId: string, field: PasswordField) {
    const map = this.revealedValues();
    if (map.has(field.id)) {
      this.revealedValues.update(m => { const next = new Map(m); next.delete(field.id); return next; });
      return;
    }
    const { value } = await lastValueFrom(this.svc.reveal(entryId, field.id));
    this.revealedValues.update(m => new Map(m).set(field.id, value));
  }

  async copyField(entryId: string, field: PasswordField) {
    let value: string;
    if (!field.is_sensitive) {
      value = field.value_enc;
    } else {
      value = this.revealedValues().get(field.id) ?? '';
      if (!value) {
        const res = await lastValueFrom(this.svc.reveal(entryId, field.id));
        value = res.value;
      }
    }
    await navigator.clipboard.writeText(value);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  onEditBackdropMousedown(event: MouseEvent) {
    this._editMousedownOnBackdrop = event.target === event.currentTarget;
  }

  onEditBackdropClick(event: MouseEvent) {
    if (this._editMousedownOnBackdrop && event.target === event.currentTarget) {
      this.editEntry.set(null);
    }
  }

  startEdit(entry: Password) {
    this.editEntry.set(entry);
    this.editName.set(entry.name);
    this.editCategory.set(entry.category ?? '');
    this.editFieldValues.set(new Map());
    this.editFieldSensitive.set(new Map(entry.fields.map(f => [f.id, f.is_sensitive])));
  }

  patchEditField(fieldId: string, value: string) {
    this.editFieldValues.update(m => new Map(m).set(fieldId, value));
  }

  toggleEditSensitive(fieldId: string) {
    this.editFieldSensitive.update(m => {
      const next = new Map(m);
      next.set(fieldId, !next.get(fieldId));
      return next;
    });
  }

  async copyText(text: string | null) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async submitEdit() {
    const entry = this.editEntry();
    if (!entry) return;
    await lastValueFrom(this.svc.update(entry.id, {
      name: this.editName().trim(),
      category: this.editCategory().trim() || undefined,
    }));
    const fieldValues = this.editFieldValues();
    const fieldSensitive = this.editFieldSensitive();
    for (const field of entry.fields) {
      const newValue = fieldValues.get(field.id) ?? '';
      const newSensitive = fieldSensitive.get(field.id) ?? field.is_sensitive;
      const valueChanged = newValue.trim().length > 0;
      const sensitiveChanged = newSensitive !== field.is_sensitive;
      if (!valueChanged && !sensitiveChanged) continue;
      // Seguridad: si era sensible y se desmarca sin ingresar nuevo valor → borrar el valor
      const clearValue = field.is_sensitive && !newSensitive && !valueChanged;
      await lastValueFrom(this.svc.updateField(entry.id, field.id, {
        value: valueChanged ? newValue : clearValue ? '' : undefined,
        is_sensitive: newSensitive,
      }));
    }
    this.passwordsResource.reload();
    this.editEntry.set(null);
  }
}
