export interface NavChildItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon: string;
  exact?: boolean;
  children?: NavChildItem[];
}

export const APP_NAVIGATION: readonly NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'lucideLayoutDashboard',
    exact: true,
  },
  {
    id: 'sales',
    label: 'Vendas',
    path: '/sales',
    icon: 'lucideShoppingCart',
  },
  {
    id: 'purchases',
    label: 'Compras',
    path: '/purchases',
    icon: 'lucideShoppingBag',
  },
  {
    id: 'inventory',
    label: 'Estoque',
    path: '/inventory',
    icon: 'lucidePackageOpen',
  },
  {
    id: 'products',
    label: 'Produtos',
    path: '/products',
    icon: 'lucidePackage',
  },
  {
    id: 'suppliers',
    label: 'Fornecedores',
    path: '/suppliers',
    icon: 'lucideTruck',
  },
  {
    id: 'finance',
    label: 'Financeiro',
    icon: 'lucideLandmark',
    children: [
      {
        id: 'finance-incomes',
        label: 'Receitas',
        path: '/finance/incomes',
        icon: 'lucideTrendingUp',
      },
      {
        id: 'finance-expenses',
        label: 'Despesas',
        path: '/finance/expenses',
        icon: 'lucideTrendingDown',
      },
    ],
  },
  {
    id: 'loans',
    label: 'Empréstimos',
    path: '/loans',
    icon: 'lucideHandCoins',
  },
  {
    id: 'monthly-closing',
    label: 'Fechamento Mensal',
    path: '/monthly-closing',
    icon: 'lucideCalendarCheck',
  },
] as const;
