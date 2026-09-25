import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

let isRegistered = false;

/**
 * Explicit tree-shaking registration for Chart.js components used in the dashboard.
 * Does NOT use `chart.js/auto` to preserve bundle optimization.
 */
export function registerDashboardCharts(): void {
  if (isRegistered) return;
  Chart.register(
    BarController,
    LineController,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  );
  isRegistered = true;
}

export interface ChartThemeColors {
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  primary: string;
  success: string;
  destructive: string;
  warning: string;
}

/**
 * Resolves current theme colors directly from CSS custom properties.
 * Eliminates hardcoded color palettes and guarantees fidelity to design tokens.
 */
export function getChartThemeColors(target: HTMLElement = document.documentElement): ChartThemeColors {
  if (typeof window === 'undefined' || !window.getComputedStyle) {
    return {
      foreground: '#0f172a',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
      card: '#ffffff',
      primary: '#2563eb',
      success: '#10b981',
      destructive: '#ef4444',
      warning: '#f59e0b',
    };
  }

  const computed = window.getComputedStyle(target);
  const getProp = (name: string, fallback: string) => {
    const val = computed.getPropertyValue(name).trim();
    return val || fallback;
  };

  return {
    foreground: getProp('--foreground', '#0f172a'),
    mutedForeground: getProp('--muted-foreground', '#64748b'),
    border: getProp('--border', '#e2e8f0'),
    card: getProp('--card', '#ffffff'),
    primary: getProp('--primary', '#2563eb'),
    success: getProp('--success', '#10b981'),
    destructive: getProp('--destructive', '#ef4444'),
    warning: getProp('--warning', '#f59e0b'),
  };
}
