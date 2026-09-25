export { formatCurrency, formatQuantity, formatAverageCost } from '../../shared/utils/decimal-format';

/**
 * Safe percentage change formatter for period comparisons.
 * Displays "Sem base de comparação" when previous period value was zero (null).
 */
export function formatPercentageChange(percentageChange: number | null | undefined): string {
  if (percentageChange === null || percentageChange === undefined) {
    return 'Sem base de comparação';
  }
  const prefix = percentageChange > 0 ? '+' : '';
  return `${prefix}${percentageChange.toFixed(2)}%`;
}

/**
 * Formats YYYY-MM-DD safely into DD/MM/YYYY without any timezone shifting or Date UTC conversion.
 */
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

const MONTH_LABELS_PT_BR: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

/**
 * Formats "YYYY-MM" to "Mês/AA" (e.g. "2026-04" -> "Abr/26") without Date timezone shifts.
 */
export function formatReferenceMonth(refMonth: string | null | undefined): string {
  if (!refMonth) return '';
  const parts = refMonth.split('-');
  if (parts.length === 2) {
    const [year, month] = parts;
    const shortMonth = MONTH_LABELS_PT_BR[month] ?? month;
    const shortYear = year.slice(-2);
    return `${shortMonth}/${shortYear}`;
  }
  return refMonth;
}

/**
 * Compact currency label formatter for chart Y-axis ticks (e.g. "R$ 10 mil", "R$ 1,5 mi").
 */
export function formatAxisCurrency(value: number): string {
  if (value === 0) return 'R$ 0';
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const prefix = isNegative ? '-R$ ' : 'R$ ';

  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',');
    return `${prefix}${val} mi`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(0);
    return `${prefix}${val} mil`;
  }
  return `${prefix}${abs.toFixed(0)}`;
}

/**
 * Checks if all data points in a cash flow series have zero movement.
 */
export function isCashFlowSeriesEmpty(
  series: Array<{ inflows: string; outflows: string; netCashFlow: string }> | null | undefined,
): boolean {
  if (!series || series.length === 0) return true;
  return series.every(
    (p) =>
      (p.inflows === '0.00' || p.inflows === '0' || Number(p.inflows) === 0) &&
      (p.outflows === '0.00' || p.outflows === '0' || Number(p.outflows) === 0) &&
      (p.netCashFlow === '0.00' || p.netCashFlow === '0' || Number(p.netCashFlow) === 0),
  );
}

/**
 * Checks if all data points in a trends series have zero movement.
 */
export function isTrendsSeriesEmpty(
  series:
    | Array<{ grossRevenue: string; grossProfit: string; operatingResult: string; netCashFlow: string }>
    | null
    | undefined,
): boolean {
  if (!series || series.length === 0) return true;
  return series.every(
    (p) =>
      (p.grossRevenue === '0.00' || p.grossRevenue === '0' || Number(p.grossRevenue) === 0) &&
      (p.grossProfit === '0.00' || p.grossProfit === '0' || Number(p.grossProfit) === 0) &&
      (p.operatingResult === '0.00' || p.operatingResult === '0' || Number(p.operatingResult) === 0) &&
      (p.netCashFlow === '0.00' || p.netCashFlow === '0' || Number(p.netCashFlow) === 0),
  );
}

