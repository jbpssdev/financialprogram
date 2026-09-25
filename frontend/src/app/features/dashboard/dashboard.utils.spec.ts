import {
  formatAxisCurrency,
  formatCurrency,
  formatDateOnly,
  formatPercentageChange,
  formatQuantity,
  formatReferenceMonth,
  isCashFlowSeriesEmpty,
  isTrendsSeriesEmpty,
} from './dashboard.utils';

describe('dashboard.utils', () => {
  describe('formatCurrency', () => {
    it('should format standard positive decimals with thousands separator', () => {
      expect(formatCurrency('1234.56')).toBe('R$ 1.234,56');
      expect(formatCurrency('123456789012.34')).toBe('R$ 123.456.789.012,34');
      expect(formatCurrency('100.00')).toBe('R$ 100,00');
    });

    it('should format negative decimals properly with negative prefix', () => {
      expect(formatCurrency('-950.25')).toBe('-R$ 950,25');
      expect(formatCurrency('-15000.00')).toBe('-R$ 15.000,00');
    });

    it('should format zero without negative prefix', () => {
      expect(formatCurrency('0.00')).toBe('R$ 0,00');
      expect(formatCurrency('-0.00')).toBe('R$ 0,00');
      expect(formatCurrency(null)).toBe('R$ 0,00');
      expect(formatCurrency(undefined)).toBe('R$ 0,00');
    });

    it('should pad single or missing decimals to 2 places', () => {
      expect(formatCurrency('50')).toBe('R$ 50,00');
      expect(formatCurrency('50.5')).toBe('R$ 50,50');
    });
  });

  describe('formatQuantity', () => {
    it('should strip trailing zeros from decimal quantities', () => {
      expect(formatQuantity('90.000')).toBe('90');
      expect(formatQuantity('1.500')).toBe('1,5');
      expect(formatQuantity('0.250')).toBe('0,25');
      expect(formatQuantity('1234.560')).toBe('1.234,56');
    });

    it('should attach unit of measure when supplied', () => {
      expect(formatQuantity('50.000', 'UN')).toBe('50 UN');
      expect(formatQuantity('2.500', 'KG')).toBe('2,5 KG');
    });

    it('should handle zero gracefully', () => {
      expect(formatQuantity('0.000')).toBe('0');
      expect(formatQuantity('0.000', 'UN')).toBe('0 UN');
      expect(formatQuantity(null)).toBe('0');
    });
  });

  describe('formatPercentageChange', () => {
    it('should return "Sem base de comparação" when percentageChange is null or undefined', () => {
      expect(formatPercentageChange(null)).toBe('Sem base de comparação');
      expect(formatPercentageChange(undefined)).toBe('Sem base de comparação');
    });

    it('should prefix positive values with + and negative with -', () => {
      expect(formatPercentageChange(25.5)).toBe('+25.50%');
      expect(formatPercentageChange(-12.34)).toBe('-12.34%');
      expect(formatPercentageChange(0)).toBe('0.00%');
    });
  });

  describe('formatDateOnly', () => {
    it('should format YYYY-MM-DD into DD/MM/YYYY without timezone shift', () => {
      expect(formatDateOnly('2026-09-01')).toBe('01/09/2026');
      expect(formatDateOnly('2026-12-31')).toBe('31/12/2026');
    });

    it('should extract date part from ISO string', () => {
      expect(formatDateOnly('2026-09-24T18:30:00.000Z')).toBe('24/09/2026');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatDateOnly(null)).toBe('');
      expect(formatDateOnly(undefined)).toBe('');
    });
  });

  describe('formatReferenceMonth', () => {
    it('should format YYYY-MM into Mês/AA in pt-BR', () => {
      expect(formatReferenceMonth('2026-01')).toBe('Jan/26');
      expect(formatReferenceMonth('2026-04')).toBe('Abr/26');
      expect(formatReferenceMonth('2026-09')).toBe('Set/26');
      expect(formatReferenceMonth('2026-12')).toBe('Dez/26');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatReferenceMonth(null)).toBe('');
      expect(formatReferenceMonth(undefined)).toBe('');
    });
  });

  describe('formatAxisCurrency', () => {
    it('should format millions with mi suffix', () => {
      expect(formatAxisCurrency(1500000)).toBe('R$ 1,5 mi');
      expect(formatAxisCurrency(2000000)).toBe('R$ 2 mi');
      expect(formatAxisCurrency(-1200000)).toBe('-R$ 1,2 mi');
    });

    it('should format thousands with mil suffix', () => {
      expect(formatAxisCurrency(10000)).toBe('R$ 10 mil');
      expect(formatAxisCurrency(25000)).toBe('R$ 25 mil');
      expect(formatAxisCurrency(-5000)).toBe('-R$ 5 mil');
    });

    it('should format small numbers directly and handle 0', () => {
      expect(formatAxisCurrency(0)).toBe('R$ 0');
      expect(formatAxisCurrency(500)).toBe('R$ 500');
    });
  });

  describe('isCashFlowSeriesEmpty & isTrendsSeriesEmpty', () => {
    it('should identify empty cash flow series', () => {
      expect(isCashFlowSeriesEmpty(null)).toBe(true);
      expect(isCashFlowSeriesEmpty([])).toBe(true);
      expect(
        isCashFlowSeriesEmpty([
          { inflows: '0.00', outflows: '0.00', netCashFlow: '0.00' },
          { inflows: '0', outflows: '0', netCashFlow: '0' },
        ]),
      ).toBe(true);
      expect(
        isCashFlowSeriesEmpty([
          { inflows: '100.00', outflows: '0.00', netCashFlow: '100.00' },
        ]),
      ).toBe(false);
    });

    it('should identify empty trends series', () => {
      expect(isTrendsSeriesEmpty(null)).toBe(true);
      expect(isTrendsSeriesEmpty([])).toBe(true);
      expect(
        isTrendsSeriesEmpty([
          { grossRevenue: '0.00', grossProfit: '0.00', operatingResult: '0.00', netCashFlow: '0.00' },
        ]),
      ).toBe(true);
      expect(
        isTrendsSeriesEmpty([
          { grossRevenue: '500.00', grossProfit: '0.00', operatingResult: '0.00', netCashFlow: '0.00' },
        ]),
      ).toBe(false);
    });
  });
});

