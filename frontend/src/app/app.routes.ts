import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent) },
  { path: 'issues', loadComponent: () => import('./pages/issues/issues.component').then(m => m.IssuesComponent) },
  { path: 'states', loadComponent: () => import('./pages/states/states.component').then(m => m.StatesComponent) },
  { path: 'labels', loadComponent: () => import('./pages/labels/labels.component').then(m => m.LabelsComponent) },
  { path: 'boards', loadComponent: () => import('./pages/boards/boards.component').then(m => m.BoardsComponent) },
  { path: 'boards/:id', loadComponent: () => import('./pages/boards/board-detail/board-detail.component').then(m => m.BoardDetailComponent) },
  { path: 'passwords', loadComponent: () => import('./pages/passwords/passwords.component').then(m => m.PasswordsComponent) },
];
