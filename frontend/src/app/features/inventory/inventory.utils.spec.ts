import {
  formatAverageCost,
  formatCurrency,
  formatDateTime,
  formatQuantity,
  getItemTypeLabel,
  getStockMovementTypeBadgeClass,
  getStockMovementTypeLabel,
  getUnitOfMeasureLabel,
  isValidStockQuantity,
  isValidUnitCost,
  isZeroStock,
} from './inventory.utils';
import { InventoryProduct } from './inventory.models';

describe('InventoryUtils', () => {
  describe('formatCurrency and formatAverageCost', () => {
    it('should format monetary values with 2 decimals without floating point conversion', () => {
      expect(formatCurrency('1250.50')).toBe('R$ 1.250,50');
      expect(formatCurrency('0')).toBe('R$ 0,00');
      expect(formatCurrency(null)).toBe('R$ 0,00');
      expect(formatCurrency(undefined)).toBe('R$ 0,00');
    });

    it('should format average cost preserving 4 decimals', () => {
      expect(formatAverageCost('4.5')).toBe('R$ 4,5000');
      expect(formatAverageCost('12.3456')).toBe('R$ 12,3456');
      expect(formatAverageCost('0.0000')).toBe('R$ 0,0000');
    });
  });

  describe('formatQuantity', () => {
    it('should format quantities up to 3 decimals removing trailing zeros', () => {
      expect(formatQuantity('10.000')).toBe('10');
      expect(formatQuantity('10.500')).toBe('10,5');
      expect(formatQuantity('10.125')).toBe('10,125');
      expect(formatQuantity('1250.750', 'kg')).toBe('1.250,75 kg');
      expect(formatQuantity(null, 'un')).toBe('0 un');
    });
  });

  describe('formatDateTime', () => {
    it('should format valid ISO strings to pt-BR format', () => {
      const formatted = formatDateTime('2026-09-24T14:30:00.000Z');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/);
    });

    it('should handle null or invalid dates gracefully', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatDateTime('invalid-date')).toBe('—');
    });
  });

  describe('isValidStockQuantity', () => {
    it('should accept positive numbers with up to 3 decimals', () => {
      expect(isValidStockQuantity(10)).toBe(true);
      expect(isValidStockQuantity(0.001)).toBe(true);
      expect(isValidStockQuantity(123.456)).toBe(true);
    });

    it('should reject non-positive numbers or numbers with excess decimals', () => {
      expect(isValidStockQuantity(0)).toBe(false);
      expect(isValidStockQuantity(-5)).toBe(false);
      expect(isValidStockQuantity(1.1234)).toBe(false);
      expect(isValidStockQuantity(NaN)).toBe(false);
      expect(isValidStockQuantity(Infinity)).toBe(false);
      expect(isValidStockQuantity('10')).toBe(false);
      expect(isValidStockQuantity(null)).toBe(false);
    });
  });

  describe('isValidUnitCost', () => {
    it('should accept non-negative numbers with up to 4 decimals', () => {
      expect(isValidUnitCost(0)).toBe(true);
      expect(isValidUnitCost(4.5)).toBe(true);
      expect(isValidUnitCost(10.1234)).toBe(true);
    });

    it('should reject negative numbers or numbers with excess decimals', () => {
      expect(isValidUnitCost(-0.01)).toBe(false);
      expect(isValidUnitCost(1.12345)).toBe(false);
      expect(isValidUnitCost(NaN)).toBe(false);
      expect(isValidUnitCost(Infinity)).toBe(false);
    });
  });

  describe('getStockMovementTypeLabel', () => {
    it('should return localized labels for all stock movement types', () => {
      expect(getStockMovementTypeLabel('INITIAL_BALANCE')).toBe('Saldo Inicial');
      expect(getStockMovementTypeLabel('PURCHASE')).toBe('Compra');
      expect(getStockMovementTypeLabel('PURCHASE_RETURN')).toBe('Devolução de Compra');
      expect(getStockMovementTypeLabel('SALE')).toBe('Venda');
      expect(getStockMovementTypeLabel('SALE_RETURN')).toBe('Devolução de Venda');
      expect(getStockMovementTypeLabel('ADJUSTMENT_POSITIVE')).toBe('Ajuste Positivo');
      expect(getStockMovementTypeLabel('ADJUSTMENT_NEGATIVE')).toBe('Ajuste Negativo');
      expect(getStockMovementTypeLabel('LOSS')).toBe('Perda');
      expect(getStockMovementTypeLabel('INTERNAL_CONSUMPTION')).toBe('Consumo Interno');
    });
  });

  describe('getStockMovementTypeBadgeClass', () => {
    it('should return appropriate css classes', () => {
      expect(getStockMovementTypeBadgeClass('INITIAL_BALANCE')).toContain('bg-blue');
      expect(getStockMovementTypeBadgeClass('PURCHASE')).toContain('bg-emerald');
      expect(getStockMovementTypeBadgeClass('SALE')).toContain('bg-amber');
      expect(getStockMovementTypeBadgeClass('LOSS')).toContain('bg-rose');
    });
  });

  describe('getItemTypeLabel and getUnitOfMeasureLabel', () => {
    it('should translate item types and unit labels', () => {
      expect(getItemTypeLabel('PRODUCT_STOCK')).toBe('Produto com estoque');
      expect(getItemTypeLabel('SERVICE')).toBe('Serviço');
      expect(getUnitOfMeasureLabel('KG')).toBe('Quilograma (kg)');
      expect(getUnitOfMeasureLabel('UNIT')).toBe('Unidade (un)');
    });
  });

  describe('isZeroStock', () => {
    it('should identify zero stock products correctly', () => {
      const zeroProduct = {
        type: 'PRODUCT_STOCK',
        currentStock: '0.000',
      } as InventoryProduct;
      const nonZeroProduct = {
        type: 'PRODUCT_STOCK',
        currentStock: '15.000',
      } as InventoryProduct;
      const serviceProduct = {
        type: 'SERVICE',
        currentStock: '0.000',
      } as InventoryProduct;

      expect(isZeroStock(zeroProduct)).toBe(true);
      expect(isZeroStock(nonZeroProduct)).toBe(false);
      expect(isZeroStock(serviceProduct)).toBe(false);
    });
  });
});
