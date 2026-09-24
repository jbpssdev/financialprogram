import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./features/sales/sales.component').then((m) => m.SalesComponent),
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./features/purchases/purchases.component').then((m) => m.PurchasesComponent),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/suppliers.component').then((m) => m.SuppliersComponent),
      },
      {
        path: 'finance/incomes',
        loadComponent: () =>
          import('./features/finance/incomes/incomes.component').then((m) => m.IncomesComponent),
      },
      {
        path: 'finance/expenses',
        loadComponent: () =>
          import('./features/finance/expenses/expenses.component').then((m) => m.ExpensesComponent),
      },
      {
        path: 'loans',
        loadComponent: () =>
          import('./features/loans/loans.component').then((m) => m.LoansComponent),
      },
      {
        path: 'monthly-closing',
        loadComponent: () =>
          import('./features/monthly-closing/monthly-closing.component').then(
            (m) => m.MonthlyClosingComponent,
          ),
      },
    ],
  },
  {
    path: 'ui-preview',
    loadComponent: () =>
      import('./features/ui-preview/ui-preview.component').then((m) => m.UiPreviewComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
