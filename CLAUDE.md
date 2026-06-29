# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack personal task manager that syncs with **Plane.so** (a project management SaaS) and adds kanban boards on top. The backend fetches data from the Plane API, stores it locally in PostgreSQL, and the Angular frontend provides the UI.

## Commands

### Backend (NestJS)
```bash
cd backend
npm run start:dev     # Dev server with watch mode (port 3000)
npm run build         # Compile TypeScript
npm run start:prod    # Run compiled output
npm run lint          # ESLint with auto-fix
npm run test          # Jest unit tests
npm run test:watch    # Jest in watch mode
npm run test:cov      # Jest with coverage
npm run test:e2e      # End-to-end tests
```

### Frontend (Angular)
```bash
cd frontend
npm start             # Dev server (port 4200, proxies /api → localhost:3000)
npm run build         # Production build
npm run test          # Vitest
```

### Docker (production)
```bash
docker compose up --build   # Runs full stack; nginx on port 4321
```

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:
- `PLANE_API_KEY` — from Plane.so account settings
- `PLANE_WORKSPACE_SLUG` — your Plane workspace slug
- `PLANE_API_URL` — defaults to `https://api.plane.so`
- `DATABASE_URL` — PostgreSQL connection string

TypeORM runs with `synchronize: true`, so schema is auto-updated on startup — no migration commands needed in development.

## Architecture

### Backend (`backend/src/`)

NestJS 11 app with feature modules organized by domain:

| Module | Purpose |
|--------|---------|
| `plane/` | Axios client wrapping the Plane.so REST API (`PlaneService`) |
| `sync/` | Orchestrates pulling data from Plane into the local DB |
| `projects/` | Local Project entity + CRUD |
| `issues/` | Local Issue entity + CRUD |
| `states/` | Issue state entity |
| `labels/` | Issue label entity |
| `boards/` | Kanban boards (Board + BoardIssue join entity with position) |

**Data flow**: `SyncService` calls `PlaneService` → upserts into PostgreSQL via TypeORM repositories. The frontend only talks to the local NestJS API; it never calls Plane directly.

**PlaneService** (`plane/plane.service.ts`): All Plane API calls go through a private `call()` wrapper that handles errors and throws NestJS `HttpException`s with Spanish messages.

### Frontend (`frontend/src/app/`)

Angular 21 app using **standalone components** and **zoneless change detection** (`provideExperimentalZonelessChangeDetection()`).

| Directory | Purpose |
|-----------|---------|
| `pages/` | Route-level components: projects, issues, states, labels, boards, board-detail |
| `core/services/` | HTTP services (one per entity) calling `/api/*` endpoints |
| `models/index.ts` | All shared TypeScript interfaces |
| `shared/` | Reusable components (e.g., `issue-panel` for the issue detail/edit drawer) |

**Routing** (`app.routes.ts`): All routes are lazy-loaded. Default redirects to `/projects`.

**Reactive pattern**: Components use Angular's `rxResource()` for data fetching with signal-based state.

**Drag-and-drop**: Board detail uses `@angular/cdk/drag-drop` for kanban card ordering.

### API Proxy

In development, `proxy.conf.json` forwards `/api/**` from port 4200 → port 3000, so no CORS setup is needed during local development.

### Docker / Production

Three services in `docker-compose.yml`:
- `backend` — NestJS on port 3000 (internal)
- `frontend` — Angular static build served by nginx (internal)
- `nginx` — Reverse proxy exposed on **port 4321**, routing to both services

## Styling Conventions

- Tailwind CSS with custom CSS variables (`--color-base`, `--color-surface`, `--color-tint`, etc.) defined in `styles.css`
- Reusable utility classes defined in `@layer components`: `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.field-input`, `.field-select`
- Priority badge classes: `.priority-urgent`, `.priority-high`, `.priority-medium`, `.priority-low`, `.priority-none`
- UI labels are in **Spanish** (Proyectos, Tareas, Tableros, Estados, Etiquetas)
