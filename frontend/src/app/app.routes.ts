import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ui-preview',
  },
  {
    path: 'ui-preview',
    loadComponent: () =>
      import('./features/ui-preview/ui-preview.component').then((m) => m.UiPreviewComponent),
  },
];
