import { ItemType, UnitOfMeasure } from './products.models';
export { formatCurrency, formatQuantity, formatAverageCost } from '../../shared/utils/decimal-format';

/** Numeric editor/HTTP boundary: reject excess precision instead of rounding.
 * The DTO requires number with at most 2 decimals; storage is Decimal(12,2). */
export function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
    value <= 9999999999.99 && /^\d+(?:\.\d{1,2})?$/.test(String(value));
}

/**
 * Formats an ISO UTC date string into pt-BR representation "DD/MM/YYYY HH:mm".
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '—';
  }
}

export const ITEM_TYPE_OPTIONS: Array<{
  value: ItemType;
  label: string;
  description: string;
}> = [
  {
    value: 'PRODUCT_STOCK',
    label: 'Produto com estoque',
    description: 'Produto físico controlado em estoque com entradas e saídas',
  },
  {
    value: 'TOKEN_QUANTITY',
    label: 'Ficha / item por quantidade',
    description: 'Item controlado por quantidade fixa (ex: fichas, créditos)',
  },
  {
    value: 'SERVICE',
    label: 'Serviço',
    description: 'Serviço sem controle físico de estoque (ex: cover, ingressos)',
  },
];

export const UNIT_OF_MEASURE_OPTIONS: Array<{
  value: UnitOfMeasure;
  label: string;
  short: string;
}> = [
  { value: 'UNIT', label: 'Unidade (un)', short: 'un' },
  { value: 'KG', label: 'Quilograma (kg)', short: 'kg' },
  { value: 'LITER', label: 'Litro (L)', short: 'L' },
  { value: 'PACK', label: 'Pacote (pct)', short: 'pct' },
  { value: 'BOX', label: 'Caixa (cx)', short: 'cx' },
  { value: 'TOKEN', label: 'Ficha / Token', short: 'fch' },
];

export function getItemTypeLabel(type: ItemType): string {
  return ITEM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function getItemTypeDescription(type: ItemType): string {
  return ITEM_TYPE_OPTIONS.find((o) => o.value === type)?.description ?? '';
}

export function getUnitOfMeasureLabel(unit: UnitOfMeasure): string {
  return UNIT_OF_MEASURE_OPTIONS.find((o) => o.value === unit)?.label ?? unit;
}

export function getUnitOfMeasureShort(unit: UnitOfMeasure): string {
  return UNIT_OF_MEASURE_OPTIONS.find((o) => o.value === unit)?.short ?? unit;
}
