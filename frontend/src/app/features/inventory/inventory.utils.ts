import {
  AllowedAdjustmentType,
  InventoryProduct,
  ItemType,
  StockMovementType,
  UnitOfMeasure,
} from './inventory.models';

export {
  formatAverageCost,
  formatCurrency,
  formatQuantity,
} from '../../shared/utils/decimal-format';

/** Form validation boundary: quantity strictly > 0 and up to 3 decimal places. */
export function isValidStockQuantity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 999999999.999 &&
    /^\d+(?:\.\d{1,3})?$/.test(String(value))
  );
}

/** Form validation boundary: unit cost >= 0 and up to 4 decimal places. */
export function isValidUnitCost(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9999999999.9999 &&
    /^\d+(?:\.\d{1,4})?$/.test(String(value))
  );
}

/** Formats an ISO UTC date string into pt-BR representation "DD/MM/YYYY HH:mm". */
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

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  INITIAL_BALANCE: 'Saldo Inicial',
  PURCHASE: 'Compra',
  PURCHASE_RETURN: 'Devolução de Compra',
  SALE: 'Venda',
  SALE_RETURN: 'Devolução de Venda',
  ADJUSTMENT_POSITIVE: 'Ajuste Positivo',
  ADJUSTMENT_NEGATIVE: 'Ajuste Negativo',
  LOSS: 'Perda',
  INTERNAL_CONSUMPTION: 'Consumo Interno',
};

export function getStockMovementTypeLabel(type: StockMovementType): string {
  return STOCK_MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function getStockMovementTypeBadgeClass(type: StockMovementType): string {
  switch (type) {
    case 'INITIAL_BALANCE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'PURCHASE':
    case 'SALE_RETURN':
    case 'ADJUSTMENT_POSITIVE':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'SALE':
    case 'PURCHASE_RETURN':
    case 'ADJUSTMENT_NEGATIVE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'LOSS':
    case 'INTERNAL_CONSUMPTION':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

export const ALLOWED_ADJUSTMENT_OPTIONS: Array<{
  value: AllowedAdjustmentType;
  label: string;
  description: string;
  isNegative: boolean;
}> = [
  {
    value: 'ADJUSTMENT_POSITIVE',
    label: 'Ajuste Positivo (Entrada)',
    description: 'Aumento de saldo apurado em contagem / sobra de inventário',
    isNegative: false,
  },
  {
    value: 'ADJUSTMENT_NEGATIVE',
    label: 'Ajuste Negativo (Saída)',
    description: 'Redução de saldo apurado em contagem / falta de inventário',
    isNegative: true,
  },
  {
    value: 'LOSS',
    label: 'Perda / Avaria (Saída)',
    description: 'Baixa de estoque por quebra, estrago ou vencimento',
    isNegative: true,
  },
  {
    value: 'INTERNAL_CONSUMPTION',
    label: 'Consumo Interno (Saída)',
    description: 'Uso próprio ou cortesia concedida pelo estabelecimento',
    isNegative: true,
  },
];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  PRODUCT_STOCK: 'Produto com estoque',
  TOKEN_QUANTITY: 'Ficha / item por quantidade',
  SERVICE: 'Serviço',
};

export function getItemTypeLabel(type: ItemType): string {
  return ITEM_TYPE_LABELS[type] ?? type;
}

export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  UNIT: 'Unidade (un)',
  KG: 'Quilograma (kg)',
  LITER: 'Litro (L)',
  PACK: 'Pacote (pct)',
  BOX: 'Caixa (cx)',
  TOKEN: 'Ficha / Token',
};

export function getUnitOfMeasureLabel(unit: UnitOfMeasure): string {
  return UNIT_LABELS[unit] ?? unit;
}

export function isZeroStock(item: InventoryProduct): boolean {
  if (item.type === 'SERVICE') return false;
  const raw = item.currentStock?.trim() ?? '0';
  const clean = raw.replace('-', '');
  const [intPart = '0', decPart = ''] = clean.split('.');
  return /^0+$/.test(intPart) && /^0*$/.test(decPart);
}
