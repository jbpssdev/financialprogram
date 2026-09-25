import {
  formatCurrency,
  formatAverageCost,
  isValidPrice,
  formatDateTime,
  formatQuantity,
  getItemTypeDescription,
  getItemTypeLabel,
  getUnitOfMeasureLabel,
  getUnitOfMeasureShort,
  ITEM_TYPE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
} from './products.utils';

describe('ProductsUtils', () => {
  it('preserves technical cost precision and large Decimal strings', () => {
    expect(formatAverageCost('1234567890.1234')).toBe('R$ 1.234.567.890,1234');
    expect(formatAverageCost('0.0001')).toBe('R$ 0,0001');
    expect(formatAverageCost('150')).toBe('R$ 150,0000');
    expect(formatCurrency('9007199254740993.99')).toBe('R$ 9.007.199.254.740.993,99');
    expect(formatQuantity('999999999.999')).toBe('999.999.999,999');
  });

  it('validates the numeric HTTP boundary without silently rounding', () => {
    for (const price of [0, 0.01, 1.1, 19.99, 9999999999.99]) expect(isValidPrice(price)).toBe(true);
    for (const price of [null, '', NaN, Infinity, -Infinity, -0.01, 1.001, 1.005, 1e-7, 1e10]) {
      expect(isValidPrice(price)).toBe(false);
    }
  });
  describe('formatCurrency', () => {
    it('should format valid positive decimal strings and numbers', () => {
      expect(formatCurrency('15.50')).toBe('R$ 15,50');
      expect(formatCurrency(15.5)).toBe('R$ 15,50');
      expect(formatCurrency('1250000.99')).toBe('R$ 1.250.000,99');
    });

    it('should handle zero and negative values', () => {
      expect(formatCurrency('0.00')).toBe('R$ 0,00');
      expect(formatCurrency(0)).toBe('R$ 0,00');
      expect(formatCurrency('-25.00')).toBe('-R$ 25,00');
      expect(formatCurrency('-0.00')).toBe('R$ 0,00');
    });

    it('should handle null, undefined and empty values', () => {
      expect(formatCurrency(null)).toBe('R$ 0,00');
      expect(formatCurrency(undefined)).toBe('R$ 0,00');
      expect(formatCurrency('')).toBe('R$ 0,00');
    });
  });

  describe('formatQuantity', () => {
    it('should format integer quantities', () => {
      expect(formatQuantity('10', 'un')).toBe('10 un');
      expect(formatQuantity(1000, 'un')).toBe('1.000 un');
    });

    it('should strip trailing decimal zeros while preserving fractional precision', () => {
      expect(formatQuantity('2.500', 'kg')).toBe('2,5 kg');
      expect(formatQuantity('0.125', 'kg')).toBe('0,125 kg');
      expect(formatQuantity('5.000', 'L')).toBe('5 L');
    });

    it('should handle negative and empty quantities', () => {
      expect(formatQuantity('-2.5', 'un')).toBe('-2,5 un');
      expect(formatQuantity(null)).toBe('0');
      expect(formatQuantity('')).toBe('0');
    });
  });

  describe('formatDateTime', () => {
    it('should format valid ISO string to dd/MM/yyyy HH:mm', () => {
      const formatted = formatDateTime('2026-09-24T15:30:00.000Z');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/);
    });

    it('should handle invalid or null dates gracefully', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatDateTime('invalid-date')).toBe('—');
    });
  });

  describe('Enums mappings', () => {
    it('should map ItemType to user-friendly labels and descriptions', () => {
      expect(getItemTypeLabel('PRODUCT_STOCK')).toBe('Produto com estoque');
      expect(getItemTypeLabel('TOKEN_QUANTITY')).toBe('Ficha / item por quantidade');
      expect(getItemTypeLabel('SERVICE')).toBe('Serviço');

      expect(getItemTypeDescription('SERVICE')).toContain('sem controle físico de estoque');
    });

    it('should map UnitOfMeasure to user-friendly labels and abbreviations', () => {
      expect(getUnitOfMeasureLabel('UNIT')).toBe('Unidade (un)');
      expect(getUnitOfMeasureShort('UNIT')).toBe('un');
      expect(getUnitOfMeasureLabel('KG')).toBe('Quilograma (kg)');
      expect(getUnitOfMeasureShort('KG')).toBe('kg');
      expect(getUnitOfMeasureLabel('LITER')).toBe('Litro (L)');
      expect(getUnitOfMeasureShort('LITER')).toBe('L');
      expect(getUnitOfMeasureLabel('PACK')).toBe('Pacote (pct)');
      expect(getUnitOfMeasureLabel('BOX')).toBe('Caixa (cx)');
      expect(getUnitOfMeasureLabel('TOKEN')).toBe('Ficha / Token');
    });

    it('should have options matching Prisma schema definitions', () => {
      expect(ITEM_TYPE_OPTIONS.length).toBe(3);
      expect(UNIT_OF_MEASURE_OPTIONS.length).toBe(6);
    });
  });
});
