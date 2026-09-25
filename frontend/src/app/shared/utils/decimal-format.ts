/** Presentation only: Decimal strings never pass through Number. */
export function formatCurrency(value: string | number | null | undefined, fractionDigits: 2 | 4 = 2): string {
  const zero = `R$ 0,${'0'.repeat(fractionDigits)}`;
  if (value === null || value === undefined || value === '') return zero;
  const raw = typeof value === 'number' ? value.toFixed(fractionDigits) : value.trim();
  if (!raw || raw === 'NaN') return zero;
  const negative = raw.startsWith('-');
  const [integer = '0', fraction = ''] = (negative ? raw.slice(1) : raw).split('.');
  const decimals = (fraction + '0000').slice(0, fractionDigits);
  const isZero = /^0+$/.test(integer) && /^0+$/.test(decimals);
  return `${negative && !isZero ? '-' : ''}R$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
}

/** Technical unit cost: preserve the four decimal places supplied by the API. */
export function formatAverageCost(value: string | number | null | undefined): string {
  return formatCurrency(value, 4);
}

/** Decimal(12,3) quantity; remove only insignificant trailing zeros. */
export function formatQuantity(value: string | number | null | undefined, unit?: string): string {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw || raw === 'NaN') return unit ? `0 ${unit}` : '0';
  const negative = raw.startsWith('-');
  const [integer = '0', fraction = ''] = (negative ? raw.slice(1) : raw).split('.');
  const decimals = fraction.slice(0, 3).replace(/0+$/, '');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimals ? `,${decimals}` : '');
  return `${negative && formatted !== '0' ? '-' : ''}${formatted}${unit ? ` ${unit}` : ''}`;
}
