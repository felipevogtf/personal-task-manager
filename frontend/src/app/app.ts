import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="flex h-screen overflow-hidden bg-base">

      <!-- Sidebar -->
      <nav class="w-[216px] bg-surface border-r border-line-soft flex flex-col flex-shrink-0">

        <!-- Logo -->
        <div class="flex items-center gap-2.5 h-14 px-4 border-b border-line-soft">
          <div class="w-6 h-6 rounded-md bg-tint flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="1" width="4.5" height="4.5" rx="1.2" fill="rgba(255,255,255,0.9)"/>
              <rect x="7.5" y="1" width="4.5" height="4.5" rx="1.2" fill="rgba(255,255,255,0.45)"/>
              <rect x="1" y="7.5" width="4.5" height="4.5" rx="1.2" fill="rgba(255,255,255,0.45)"/>
              <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1.2" fill="rgba(255,255,255,0.2)"/>
            </svg>
          </div>
          <span class="text-[13px] font-semibold text-on">Task Manager</span>
        </div>

        <!-- Main nav -->
        <div class="flex flex-col pt-2 flex-1 px-2 gap-px">
          <a routerLink="/dashboard" routerLinkActive="is-active" class="nav-item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" opacity="0.7">
              <rect x="1" y="1" width="6" height="6" rx="1.5"/>
              <rect x="9" y="1" width="6" height="3" rx="1.2"/>
              <rect x="9" y="6" width="6" height="1.5" rx="0.75"/>
              <rect x="1" y="9" width="14" height="1.5" rx="0.75"/>
              <rect x="1" y="12" width="9" height="1.5" rx="0.75"/>
            </svg>
            <span>Dashboard</span>
          </a>

          <a routerLink="/projects" routerLinkActive="is-active" class="nav-item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" opacity="0.7">
              <rect x="2" y="2" width="5" height="5" rx="1.5"/>
              <rect x="9" y="2" width="5" height="5" rx="1.5"/>
              <rect x="2" y="9" width="5" height="5" rx="1.5"/>
              <rect x="9" y="9" width="5" height="5" rx="1.5"/>
            </svg>
            <span>Proyectos</span>
          </a>

          <a routerLink="/issues" routerLinkActive="is-active" class="nav-item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" opacity="0.7">
              <circle cx="2.5" cy="4" r="1.2"/>
              <rect x="5.5" y="3.1" width="8.5" height="1.8" rx="0.9"/>
              <circle cx="2.5" cy="8" r="1.2"/>
              <rect x="5.5" y="7.1" width="8.5" height="1.8" rx="0.9"/>
              <circle cx="2.5" cy="12" r="1.2"/>
              <rect x="5.5" y="11.1" width="8.5" height="1.8" rx="0.9"/>
            </svg>
            <span>Tareas</span>
          </a>

          <a routerLink="/boards" routerLinkActive="is-active" class="nav-item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" opacity="0.7">
              <rect x="1" y="2" width="4" height="12" rx="1.5"/>
              <rect x="6" y="2" width="4" height="8.5" rx="1.5"/>
              <rect x="11" y="2" width="4" height="10" rx="1.5"/>
            </svg>
            <span>Tableros</span>
          </a>

          <a routerLink="/passwords" routerLinkActive="is-active" class="nav-item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">
              <rect x="3" y="8" width="10" height="7" rx="1.5"/>
              <path d="M5 8V5.5a3 3 0 0 1 6 0V8"/>
              <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/>
            </svg>
            <span>Contraseñas</span>
          </a>

          <a routerLink="/documents" routerLinkActive="is-active" class="nav-item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">
              <path d="M4 2h6l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
              <path d="M10 2v4h4"/>
              <path d="M5 9h6M5 12h4"/>
            </svg>
            <span>Documentos</span>
          </a>
        </div>

        <!-- Config nav -->
        <div class="border-t border-line-soft px-2 py-2 pb-3">
          <p class="px-2.5 pt-2 pb-1 text-[10px] font-semibold text-ghost uppercase tracking-widest">Configuración</p>

          <a routerLink="/states" routerLinkActive="is-active" class="nav-item">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.7">
              <circle cx="8" cy="8" r="5.5"/>
              <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>
            </svg>
            <span>Estados</span>
          </a>

          <a routerLink="/labels" routerLinkActive="is-active" class="nav-item">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity="0.7">
              <path d="M2 2.5h5l6.5 6.5-4.5 4.5L2.5 7V2.5H2z"/>
              <circle cx="5.2" cy="5.2" r="1.1" fill="currentColor" stroke="none"/>
            </svg>
            <span>Etiquetas</span>
          </a>
        </div>

      </nav>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto min-w-0 bg-base">
        <router-outlet />
      </main>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 450;
      color: var(--color-ghost);
      text-decoration: none;
      cursor: default;
      transition: color 0.12s, background-color 0.12s;
    }
    .nav-item:hover {
      color: var(--color-dim);
      background-color: var(--color-raised);
    }
    .nav-item.is-active {
      color: var(--color-tint);
      background-color: var(--color-tint-bg);
      font-weight: 500;
    }
    .nav-item.is-active svg { opacity: 1 !important; }
    .nav-item svg { flex-shrink: 0; }
  `],
})
export class App {}
