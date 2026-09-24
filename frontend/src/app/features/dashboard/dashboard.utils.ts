/**
 * Safe currency formatter strictly for presentation.
 * Operates purely on Decimal strings to avoid IEEE-754 binary floating point precision loss.
 * Produces standard pt-BR BRL representation (e.g. "R$ 1.234,56" or "-R$ 950,25").
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';

  const raw = typeof value === 'number' ? value.toFixed(2) : value.trim();
  if (!raw || raw === 'NaN') return 'R$ 0,00';

  const isNegative = raw.startsWith('-');
  const clean = isNegative ? raw.slice(1) : raw;

  // Split integer and decimal parts
  const [intPart = '0', decPart = '00'] = clean.split('.');

  // Format integer with thousands dot separator
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Ensure exactly 2 decimal digits for monetary presentation
  const formattedDec = (decPart + '00').slice(0, 2);

  // Suppress negative sign if value evaluates to zero
  const isZero = intPart === '0' && formattedDec === '00';
  const prefix = isNegative && !isZero ? '-R$ ' : 'R$ ';

  return `${prefix}${formattedInt},${formattedDec}`;
}

/**
 * Safe quantity formatter for UI display.
 * Retains significant fractional precision (e.g. 1,5 kg or 0,25) while cleanly stripping
 * trailing decimal zeros without binary floating-point conversions.
 */
export function formatQuantity(
  value: string | number | null | undefined,
  unit?: string,
): string {
  if (value === null || value === undefined || value === '') return `0 ${unit ?? ''}`.trim();

  const raw = typeof value === 'number' ? value.toString() : value.trim();
  if (!raw || raw === 'NaN') return `0 ${unit ?? ''}`.trim();

  const isNegative = raw.startsWith('-');
  const clean = isNegative ? raw.slice(1) : raw;

  const [intPart = '0', decPart] = clean.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let result = formattedInt;

  if (decPart !== undefined) {
    const trimmedDec = decPart.slice(0, 3).replace(/0+$/, '');
    if (trimmedDec.length > 0) {
      result += ',' + trimmedDec;
    }
  }

  const isZero = result === '0';
  const signedResult = isNegative && !isZero ? `-${result}` : result;

  return unit ? `${signedResult} ${unit}` : signedResult;
}

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
