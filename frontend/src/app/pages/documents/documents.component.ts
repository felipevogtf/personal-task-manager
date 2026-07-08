import {
  AfterViewInit, ChangeDetectionStrategy, Component, ViewEncapsulation,
  ElementRef, OnDestroy, ViewChild, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { marked } from 'marked';
import { DocumentsService } from '../../core/services/documents.service';
import { DocumentMeta } from '../../models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="flex overflow-hidden" style="height: 100vh">

      <!-- Sidebar izquierdo -->
      <aside class="w-[220px] flex-shrink-0 bg-surface border-r border-line-soft flex flex-col">
        <div class="flex items-center gap-2 px-3 py-3 border-b border-line-soft">
          <h2 class="text-[13px] font-semibold text-on flex-1">Documentos</h2>
          <button class="icon-btn" title="Nuevo temporal" (click)="newTemp()">
            <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1a.5.5 0 0 1 .5.5V5.5h4a.5.5 0 0 1 0 1H6.5v4a.5.5 0 0 1-1 0V6.5H1.5a.5.5 0 0 1 0-1H5.5V1.5A.5.5 0 0 1 6 1z"/>
            </svg>
          </button>
        </div>

        <!-- Búsqueda -->
        <div class="px-3 py-2 border-b border-line-soft">
          <input
            type="text"
            class="field-input w-full text-[12.5px]"
            placeholder="Buscar…"
            [value]="search()"
            (input)="search.set($any($event.target).value)" />
        </div>

        <!-- Lista -->
        <div class="flex-1 overflow-y-auto py-1">
          @if (docsResource.isLoading()) {
            <div class="px-3 py-4 text-[12.5px] text-ghost">Cargando…</div>
          }
          @for (doc of filteredDocs(); track doc.id) {
            <button
              class="w-full text-left px-3 py-2.5 text-[12.5px] flex items-start gap-2 transition-colors group"
              [class.bg-tint-bg]="activeId() === doc.id"
              [class.text-tint]="activeId() === doc.id"
              [class.text-dim]="activeId() !== doc.id"
              [class.hover:bg-raised]="activeId() !== doc.id"
              (click)="renamingId() === doc.id ? null : openDoc(doc.id)">
              <svg class="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2h6l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
                <path d="M10 2v4h4"/>
              </svg>
              @if (renamingId() === doc.id) {
                <input
                  #renameInput
                  class="truncate flex-1 bg-transparent outline-none border-b border-tint text-[12.5px] min-w-0"
                  [value]="renamingTitle()"
                  (input)="renamingTitle.set($any($event.target).value)"
                  (click)="$event.stopPropagation()"
                  (keydown.enter)="commitRename(doc.id)"
                  (keydown.escape)="cancelRename()"
                  (blur)="commitRename(doc.id)" />
              } @else {
                <span class="truncate flex-1">{{ doc.title }}</span>
                <button
                  class="opacity-0 group-hover:opacity-100 icon-btn !w-[18px] !h-[18px] flex-shrink-0"
                  title="Renombrar"
                  (click)="startRename(doc, $event)">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 2a2.12 2.12 0 0 1 3 3L5 14l-4 1 1-4Z"/>
                  </svg>
                </button>
              }
              <button
                class="opacity-0 group-hover:opacity-100 icon-btn !w-[18px] !h-[18px] flex-shrink-0"
                title="Eliminar"
                (click)="$event.stopPropagation(); deleteDoc(doc.id)">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <path d="M1 1l8 8M9 1L1 9"/>
                </svg>
              </button>
            </button>
          }
          @if (!docsResource.isLoading() && !filteredDocs().length && !search()) {
            <p class="px-3 py-4 text-[12.5px] text-ghost">Sin documentos guardados</p>
          }
        </div>
      </aside>

      <!-- Área principal (siempre en DOM para que #editorHost esté disponible en ngAfterViewInit) -->
      <div class="flex-1 flex flex-col min-w-0" [class.hidden]="activeId() === null && !isTemp()">

        <!-- Barra de título + acciones -->
        <div class="flex items-center gap-3 px-5 py-2.5 border-b border-line-soft bg-surface flex-shrink-0">
          <input
            type="text"
            class="flex-1 bg-transparent text-[14px] font-semibold text-on outline-none placeholder:text-ghost min-w-0"
            placeholder="Sin título…"
            [value]="title()"
            (input)="onTitleInput($any($event.target).value)" />

          <div class="flex items-center gap-2 flex-shrink-0">
            @if (isDirty()) {
              <span class="text-[11px] text-ghost flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                Sin guardar
              </span>
            } @else if (!isTemp() && lastSaved()) {
              <span class="text-[11px] text-ghost">Guardado {{ lastSaved() }}</span>
            }

            <!-- Selector de tema de preview -->
            <div class="flex items-center gap-0.5 px-1 py-0.5 rounded-lg" style="background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.12)">
              <button
                class="preview-theme-btn"
                [class.active]="previewTheme() === 'light'"
                (click)="previewTheme.set('light')">
                Light
              </button>
              <button
                class="preview-theme-btn"
                [class.active]="previewTheme() === 'garagelabs-dark'"
                (click)="previewTheme.set('garagelabs-dark')">
                GL Dark
              </button>
            </div>

              <button class="btn text-[12.5px] flex items-center gap-1.5" (click)="exportModal.set(true)">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 2v9M4 7l4 4 4-4M2 14h12"/>
                </svg>
                PDF
              </button>

            @if (isTemp()) {
              <button class="btn-primary text-[12.5px]" [disabled]="saving()" (click)="saveNew()">
                {{ saving() ? 'Guardando…' : 'Guardar como…' }}
              </button>
            } @else {
              <button class="btn-primary text-[12.5px]" [disabled]="!isDirty() || saving()" (click)="saveExisting()">
                {{ saving() ? 'Guardando…' : 'Guardar' }}
              </button>
            }
          </div>
        </div>

        <!-- Editor + Preview -->
        <div class="flex flex-1 min-h-0">

          <!-- Editor CodeMirror -->
          <div class="flex-1 min-w-0 overflow-auto border-r border-line-soft">
            <div #editorHost class="h-full w-full"></div>
          </div>

          <!-- Preview Markdown -->
          <div class="flex-1 min-w-0 flex flex-col min-h-0" [style.background]="previewBg()">
            <div class="flex-1 overflow-auto px-10 py-8" #previewScroller>
              <div class="md-preview" [class]="'theme-' + previewTheme()" [innerHTML]="preview()"></div>
            </div>
          </div>

        </div>
      </div>

      <!-- Estado vacío -->
      <div class="flex-1 flex flex-col items-center justify-center text-center gap-3" [class.hidden]="activeId() !== null || isTemp()">
        <div class="w-12 h-12 rounded-xl bg-raised flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="text-ghost">
            <path d="M4 2h6l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
            <path d="M10 2v4h4"/>
          </svg>
        </div>
        <p class="text-[13px] font-semibold text-on">Seleccioná un documento</p>
        <p class="text-[12.5px] text-ghost">O creá uno nuevo con el botón +</p>
      </div>

    </div>

    <!-- Modal exportar PDF -->
    @if (exportModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center"
           style="background: rgba(0,0,0,0.55); backdrop-filter: blur(2px)"
           (mousedown)="onExportBackdropMousedown($event)"
           (click)="onExportBackdropClick($event)">
        <div class="bg-surface rounded-xl border border-line-soft w-[440px] flex flex-col"
             style="max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.5)"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-line-soft flex-shrink-0">
            <div class="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-ghost">
                <path d="M8 2v9M4 7l4 4 4-4M2 14h12"/>
              </svg>
              <h3 class="text-[14px] font-semibold text-on">Exportar PDF</h3>
            </div>
            <button class="icon-btn" (click)="exportModal.set(false)">
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M1 1l8 8M9 1L1 9"/>
              </svg>
            </button>
          </div>

          <div class="px-5 py-5 flex flex-col gap-5">

            <!-- Selector plantilla -->
            <div>
              <p class="text-[11px] font-semibold text-ghost uppercase tracking-widest mb-2.5">Plantilla</p>
              <div class="rounded-xl p-3.5 flex items-center gap-3.5 cursor-default"
                   style="border: 1px solid var(--color-tint); background: rgba(55,236,186,0.06)">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                     style="background: #10101C; border: 1px solid #37ECBA">
                  <span class="text-[9px] font-bold" style="color:#37ECBA; font-family: monospace">GL</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[12.5px] font-semibold text-on">Garage Labs</p>
                  <p class="text-[11px] text-ghost">Portada Navy/Teal con identidad corporativa</p>
                </div>
                <div class="w-4 h-4 rounded-full flex-shrink-0" style="background:#37ECBA"></div>
              </div>
            </div>

            <!-- Metadatos -->
            <div class="flex flex-col gap-3">
              <p class="text-[11px] font-semibold text-ghost uppercase tracking-widest">Metadatos</p>

              <div>
                <label class="text-[11px] text-ghost block mb-1.5">Eyebrow</label>
                <input type="text" class="field-input w-full"
                       [value]="exportEyebrow()"
                       (input)="exportEyebrow.set($any($event.target).value)" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[11px] text-ghost block mb-1.5">Preparado para</label>
                  <input type="text" class="field-input w-full" placeholder="Cliente…"
                         [value]="exportPreparedFor()"
                         (input)="exportPreparedFor.set($any($event.target).value)" />
                </div>
                <div>
                  <label class="text-[11px] text-ghost block mb-1.5">Preparado por</label>
                  <input type="text" class="field-input w-full"
                         [value]="exportPreparedBy()"
                         (input)="exportPreparedBy.set($any($event.target).value)" />
                </div>
              </div>

              <div style="width: 50%">
                <label class="text-[11px] text-ghost block mb-1.5">Fecha</label>
                <input type="text" class="field-input w-full" placeholder="Julio 2026"
                       [value]="exportDate()"
                       (input)="exportDate.set($any($event.target).value)" />
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-line-soft flex-shrink-0">
            <button class="btn" (click)="exportModal.set(false)">Cancelar</button>
            <button class="btn-primary flex items-center gap-1.5" [disabled]="exporting()" (click)="doExportPdf()">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v9M4 7l4 4 4-4M2 14h12"/>
              </svg>
              {{ exporting() ? 'Generando…' : 'Exportar PDF' }}
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .icon-btn {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 6px;
      border: none; background: transparent;
      color: var(--color-ghost); cursor: pointer;
      transition: color 0.1s, background 0.1s; flex-shrink: 0;
    }
    .icon-btn:hover { color: var(--color-dim); background: var(--color-raised); }

    /* CodeMirror host */
    .cm-editor { height: 100%; width: 100%; font-size: 16px; }
    .cm-editor.cm-focused { outline: none; }
    .cm-scroller { overflow: auto; height: 100%; }

    /* ── Selector de tema ── */
    .preview-theme-btn {
      font-size: 11px; font-weight: 500;
      padding: 2px 8px; border-radius: 5px; border: none;
      cursor: pointer; color: var(--color-ghost); background: transparent;
      transition: color 0.12s, background 0.12s; white-space: nowrap;
    }
    .preview-theme-btn:hover { color: var(--color-dim); background: rgba(128,128,128,0.1); }
    .preview-theme-btn.active { color: var(--color-on); background: var(--color-raised); }

    /* ── Variables por tema ── */
    .md-preview.theme-light {
      --p-text:        #1e293b;
      --p-heading:     #0f172a;
      --p-h3:          #4f46e5;
      --p-accent:      #4f46e5;
      --p-muted:       #64748b;
      --p-strong:      #0f172a;
      --p-em:          #475569;
      --p-link:        #2563eb;
      --p-marker:      #4f46e5;
      --p-code-bg:     #f1f5f9;
      --p-code-border: #e2e8f0;
      --p-code-text:   #7c3aed;
      --p-pre-bg:      #f1f5f9;
      --p-pre-border:  #4f46e5;
      --p-pre-text:    #334155;
      --p-quote-bg:    #f8fafc;
      --p-border:      #e2e8f0;
      --p-th-bg:       #f1f5f9;
      --p-th-text:     #0f172a;
      --p-row-odd:     #ffffff;
      --p-row-even:    #f8fafc;
      --p-row-last:    #4f46e5;
      --p-hr:          #e2e8f0;
    }

    .md-preview.theme-garagelabs-dark {
      --p-text:        #D6D6E2;
      --p-heading:     #F2F2F5;
      --p-h3:          #37ECBA;
      --p-accent:      #37ECBA;
      --p-muted:       #9A9AAE;
      --p-strong:      #F2F2F5;
      --p-em:          #B8B8CC;
      --p-link:        #37ECBA;
      --p-marker:      #37ECBA;
      --p-code-bg:     #1B1B29;
      --p-code-border: #333340;
      --p-code-text:   #37ECBA;
      --p-pre-bg:      #181826;
      --p-pre-border:  #37ECBA;
      --p-pre-text:    #D6D6E2;
      --p-quote-bg:    #181826;
      --p-border:      #333340;
      --p-th-bg:       #2A2A3A;
      --p-th-text:     #F2F2F5;
      --p-row-odd:     #1B1B29;
      --p-row-even:    #202030;
      --p-row-last:    #37ECBA;
      --p-hr:          #333340;
    }

    /* ── Estilos base (usan las variables) ── */
    .md-preview {
      color: var(--p-text);
      font-size: 16px;
      line-height: 1.8;
      font-family: 'Inter', system-ui, sans-serif;
      max-width: 680px;
      margin: 0 auto;
      counter-reset: h2-counter;
    }

    .md-preview h1 {
      font-size: 1.7em; font-weight: 700; color: var(--p-heading);
      margin: 0 0 0.7em; padding-bottom: 0.35em;
      border-bottom: 1px solid var(--p-border);
    }
    .md-preview h2 {
      font-size: 1.35em; font-weight: 600; color: var(--p-heading);
      margin: 2em 0 0.55em; counter-increment: h2-counter;
    }
    .md-preview h2::before {
      content: counter(h2-counter) ".";
      color: var(--p-accent); font-weight: 700; margin-right: 0.4em;
    }
    .md-preview h3 {
      font-size: 1.1em; font-weight: 600; color: var(--p-h3);
      margin: 1.5em 0 0.4em;
    }
    .md-preview h4, .md-preview h5, .md-preview h6 {
      font-size: 0.95em; font-weight: 600; color: var(--p-muted);
      margin: 1.25em 0 0.3em;
    }

    .md-preview p  { margin: 0 0 0.9em; }
    .md-preview a  { color: var(--p-link); text-decoration: underline; text-underline-offset: 2px; }
    .md-preview strong { font-weight: 700; color: var(--p-strong); }
    .md-preview em { font-style: italic; color: var(--p-em); }

    .md-preview :not(pre) > code {
      background: var(--p-code-bg); border: 1px solid var(--p-code-border);
      border-radius: 4px; padding: 0.1em 0.4em;
      font-size: 0.83em; font-family: 'JetBrains Mono', monospace;
      color: var(--p-code-text);
    }
    .md-preview pre {
      background: var(--p-pre-bg); border-left: 3px solid var(--p-pre-border);
      border-radius: 0 8px 8px 0; padding: 1em 1.2em;
      overflow-x: auto; margin: 0 0 1.1em;
      white-space: pre; word-break: normal; overflow-wrap: normal;
    }
    .md-preview pre code {
      background: none; border: none; padding: 0;
      font-size: 0.85em; color: var(--p-pre-text);
      font-family: 'JetBrains Mono', monospace;
      white-space: inherit;
    }

    .md-preview ul { list-style-type: disc; padding-left: 1.5em; margin: 0 0 0.9em; }
    .md-preview ol { list-style-type: decimal; padding-left: 1.5em; margin: 0 0 0.9em; }
    .md-preview li { margin-bottom: 0.3em; }
    .md-preview ul li::marker { color: var(--p-marker); }
    .md-preview ol li::marker { color: var(--p-marker); font-weight: 600; }

    .md-preview blockquote {
      background: var(--p-quote-bg); border-left: 3px solid var(--p-accent);
      border-radius: 0 8px 8px 0; padding: 0.85em 1.1em;
      margin: 0 0 1.1em; color: var(--p-muted); font-style: italic;
    }
    .md-preview blockquote p { margin: 0; }

    .md-preview table {
      border-collapse: collapse; width: 100%;
      margin: 0 0 1.1em; font-size: 0.88em;
      border-radius: 8px; overflow: hidden;
    }
    .md-preview th {
      background: var(--p-th-bg); color: var(--p-th-text); font-weight: 600;
      padding: 0.55em 0.85em; text-align: left;
      border-bottom: 1px solid var(--p-border);
    }
    .md-preview td {
      padding: 0.5em 0.85em; color: var(--p-text);
      border-bottom: 1px solid var(--p-border);
    }
    .md-preview tr:nth-child(odd)  td { background: var(--p-row-odd); }
    .md-preview tr:nth-child(even) td { background: var(--p-row-even); }
    .md-preview tr:last-child td { border-bottom: 2px solid var(--p-row-last); }

    .md-preview hr  { border: none; border-top: 1px solid var(--p-hr); margin: 1.75em 0; }
    .md-preview img { max-width: 100%; border-radius: 8px; }
  `],
})
export class DocumentsComponent implements AfterViewInit, OnDestroy {
  private readonly svc = inject(DocumentsService);

  @ViewChild('editorHost') editorHost!: ElementRef<HTMLDivElement>;
  @ViewChild('previewScroller') previewScrollerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('renameInput') renameInputRef?: ElementRef<HTMLInputElement>;

  private editor: EditorView | null = null;
  private _syncingScroll = false;
  private _scrollCleanup: (() => void) | null = null;

  readonly docsResource = rxResource<DocumentMeta[], undefined>({ stream: () => this.svc.getAll() });
  readonly docs = computed(() => this.docsResource.value() ?? []);

  readonly search = signal('');
  readonly filteredDocs = computed(() => {
    const q = this.search().toLowerCase();
    return q ? this.docs().filter(d => d.title.toLowerCase().includes(q)) : this.docs();
  });

  readonly activeId = signal<string | null>(null);
  readonly isTemp = signal(false);
  readonly title = signal('');
  readonly isDirty = signal(false);
  readonly renamingId = signal<string | null>(null);
  readonly renamingTitle = signal('');
  readonly saving = signal(false);
  readonly lastSaved = signal<string>('');

  readonly previewTheme = signal<'light' | 'garagelabs-dark'>('light');
  readonly previewBg = computed(() =>
    this.previewTheme() === 'garagelabs-dark' ? '#10101C' : '#f8f9fb'
  );

  readonly exportModal = signal(false);
  readonly exportEyebrow = signal('DOCUMENTO TÉCNICO');
  readonly exportPreparedFor = signal('');
  readonly exportPreparedBy = signal('Garage Labs');
  readonly exportDate = signal('');
  readonly exporting = signal(false);

  readonly preview = computed(() => {
    const content = this._editorContent();
    if (!content.trim()) return '';
    return marked.parse(content) as string;
  });

  private _editorContent = signal('');

  ngAfterViewInit() {
    this.mountEditor('');
  }

  ngOnDestroy() {
    this.editor?.destroy();
    this._scrollCleanup?.();
  }

  private readonly _editorTheme = EditorView.theme({
    '&': { backgroundColor: '#ffffff', color: '#1e293b', height: '100%' },
    '.cm-content': { caretColor: '#1e293b', padding: '20px 32px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", lineHeight: '1.8' },
    '.cm-line': { paddingBottom: '0.05em' },
    '.cm-line:has(> br)': { paddingBottom: '0.85em' },
    '.cm-activeLine': { backgroundColor: 'rgba(79,70,229,0.03)' },
    '.cm-cursor': { borderLeftColor: '#4f46e5', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: '#dbeafe' },
    '.cm-scroller': { fontFamily: "'Inter', system-ui, -apple-system, sans-serif" },
  }, { dark: false });

  private readonly _markdownHighlight = HighlightStyle.define([
    { tag: tags.heading1, fontWeight: '700', color: '#0f172a', fontSize: '1.3em' },
    { tag: tags.heading2, fontWeight: '700', color: '#1e293b', fontSize: '1.15em' },
    { tag: tags.heading3, fontWeight: '600', color: '#4f46e5', fontSize: '1.05em' },
    { tag: tags.heading4, fontWeight: '600', color: '#6366f1' },
    { tag: tags.heading5, fontWeight: '600', color: '#818cf8' },
    { tag: tags.heading6, fontWeight: '600', color: '#a5b4fc' },
    { tag: tags.strong, fontWeight: '700', color: '#0f172a' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#334155' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#94a3b8' },
    { tag: tags.monospace, color: '#7c3aed', backgroundColor: '#f3f0ff', fontFamily: "'JetBrains Mono', monospace" },
    { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
    { tag: tags.url, color: '#2563eb' },
    { tag: tags.quote, color: '#64748b', fontStyle: 'italic' },
    { tag: tags.meta, color: '#94a3b8' },
    { tag: tags.processingInstruction, color: '#94a3b8' },
    { tag: tags.contentSeparator, color: '#94a3b8' },
  ]);

  private mountEditor(content: string) {
    this.editor?.destroy();
    const extensions = [
      history(),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
      highlightActiveLine(),
      markdown(),
      EditorView.lineWrapping,
      this._editorTheme,
      syntaxHighlighting(this._markdownHighlight),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const text = update.state.doc.toString();
          this._editorContent.set(text);
          this.isDirty.set(true);
        }
      }),
    ];
    this.editor = new EditorView({
      state: EditorState.create({ doc: content, extensions }),
      parent: this.editorHost.nativeElement,
    });
    this.setupScrollSync();
  }

  private setupScrollSync() {
    const editorScroller = this.editor!.scrollDOM;
    const previewScroller = this.previewScrollerRef?.nativeElement;
    if (!previewScroller) return;

    const syncToPreview = () => {
      if (this._syncingScroll) return;
      this._syncingScroll = true;
      const pct = editorScroller.scrollTop / Math.max(1, editorScroller.scrollHeight - editorScroller.clientHeight);
      previewScroller.scrollTop = pct * Math.max(0, previewScroller.scrollHeight - previewScroller.clientHeight);
      requestAnimationFrame(() => { this._syncingScroll = false; });
    };

    const syncToEditor = () => {
      if (this._syncingScroll) return;
      this._syncingScroll = true;
      const pct = previewScroller.scrollTop / Math.max(1, previewScroller.scrollHeight - previewScroller.clientHeight);
      editorScroller.scrollTop = pct * Math.max(0, editorScroller.scrollHeight - editorScroller.clientHeight);
      requestAnimationFrame(() => { this._syncingScroll = false; });
    };

    this._scrollCleanup?.();
    editorScroller.addEventListener('scroll', syncToPreview);
    previewScroller.addEventListener('scroll', syncToEditor);
    this._scrollCleanup = () => {
      editorScroller.removeEventListener('scroll', syncToPreview);
      previewScroller.removeEventListener('scroll', syncToEditor);
    };
  }

  private setEditorContent(content: string) {
    if (!this.editor) return;
    this.editor.dispatch({
      changes: { from: 0, to: this.editor.state.doc.length, insert: content },
    });
    this._editorContent.set(content);
    this.isDirty.set(false);
  }

  async openDoc(id: string) {
    if (this.activeId() === id) return;
    const doc = await lastValueFrom(this.svc.getOne(id));
    this.activeId.set(id);
    this.isTemp.set(false);
    this.title.set(doc.title);
    this.isDirty.set(false);
    this.lastSaved.set(this.formatDate(doc.updated_at));
    this.setEditorContent(doc.content);
  }

  newTemp() {
    this.activeId.set(null);
    this.isTemp.set(true);
    this.title.set('');
    this.isDirty.set(false);
    this.lastSaved.set('');
    this.setEditorContent('');
  }

  onTitleInput(value: string) {
    this.title.set(value);
    this.isDirty.set(true);
  }

  async saveNew() {
    const content = this._editorContent();
    const titleVal = this.title().trim() || 'Sin título';
    this.saving.set(true);
    try {
      const doc = await lastValueFrom(this.svc.create({ title: titleVal, content }));
      this.docsResource.reload();
      this.activeId.set(doc.id);
      this.isTemp.set(false);
      this.title.set(doc.title);
      this.isDirty.set(false);
      this.lastSaved.set(this.formatDate(doc.updated_at));
    } finally {
      this.saving.set(false);
    }
  }

  async saveExisting() {
    const id = this.activeId();
    if (!id) return;
    this.saving.set(true);
    try {
      const doc = await lastValueFrom(this.svc.update(id, {
        title: this.title().trim() || 'Sin título',
        content: this._editorContent(),
      }));
      this.docsResource.reload();
      this.title.set(doc.title);
      this.isDirty.set(false);
      this.lastSaved.set(this.formatDate(doc.updated_at));
    } finally {
      this.saving.set(false);
    }
  }

  startRename(doc: DocumentMeta, e: Event) {
    e.stopPropagation();
    this.renamingId.set(doc.id);
    this.renamingTitle.set(doc.title);
    setTimeout(() => this.renameInputRef?.nativeElement.focus());
  }

  async commitRename(id: string) {
    const t = this.renamingTitle().trim();
    this.renamingId.set(null);
    if (!t) return;
    await lastValueFrom(this.svc.update(id, { title: t }));
    this.docsResource.reload();
    if (this.activeId() === id) this.title.set(t);
  }

  cancelRename() {
    this.renamingId.set(null);
  }

  async deleteDoc(id: string) {
    await lastValueFrom(this.svc.remove(id));
    if (this.activeId() === id) {
      this.activeId.set(null);
      this.isTemp.set(false);
      this.setEditorContent('');
    }
    this.docsResource.reload();
  }

  private _exportMousedownOnBackdrop = false;

  onExportBackdropMousedown(e: MouseEvent) {
    this._exportMousedownOnBackdrop = e.target === e.currentTarget;
  }

  onExportBackdropClick(e: MouseEvent) {
    if (this._exportMousedownOnBackdrop) this.exportModal.set(false);
    this._exportMousedownOnBackdrop = false;
  }

  async doExportPdf() {
    this.exporting.set(true);
    try {
      const response = await lastValueFrom(this.svc.exportPdf({
        title: this.title() || 'Sin título',
        content: this._editorContent(),
        eyebrow: this.exportEyebrow() || undefined,
        preparedFor: this.exportPreparedFor() || undefined,
        preparedBy: this.exportPreparedBy() || undefined,
        date: this.exportDate() || undefined,
      }));
      const blob = response.body!;
      const cd = response.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `${(this.title() || 'document').replace(/\s+/g, '_')}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.exportModal.set(false);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      this.exporting.set(false);
    }
  }

  private formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  }
}
