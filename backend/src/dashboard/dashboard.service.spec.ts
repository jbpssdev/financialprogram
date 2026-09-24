import { Test, TestingModule } from '@nestjs/testing';
import { ClosingStatus, Prisma, SaleStatus } from '@prisma/client';
import { MonthlyClosingsService } from '../monthly-closings/monthly-closings.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;


  const mockMonthlyMetrics = {
    grossRevenue: new Prisma.Decimal('15000.00'),
    cogs: new Prisma.Decimal('8000.00'),
    grossProfit: new Prisma.Decimal('7000.00'),
    otherIncomes: new Prisma.Decimal('500.00'),
    businessExpenses: new Prisma.Decimal('2000.00'),
    loanInterestExpense: new Prisma.Decimal('150.00'),
    operatingResult: new Prisma.Decimal('5350.00'),
    personalExpenses: new Prisma.Decimal('1000.00'),
    resultAfterPersonalExpenses: new Prisma.Decimal('4350.00'),
    salesCashCollected: new Prisma.Decimal('15000.00'),
    otherIncomesCollected: new Prisma.Decimal('500.00'),
    loanProceeds: new Prisma.Decimal('0.00'),
    purchasePayments: new Prisma.Decimal('4000.00'),
    businessExpensesPaid: new Prisma.Decimal('2000.00'),
    personalExpensesPaid: new Prisma.Decimal('1000.00'),
    loanPaymentsTotal: new Prisma.Decimal('500.00'),
    totalInflows: new Prisma.Decimal('15500.00'),
    totalOutflows: new Prisma.Decimal('7500.00'),
    netCashFlow: new Prisma.Decimal('8000.00'),
    stockValue: new Prisma.Decimal('25000.00'),
    totalDebtRemaining: new Prisma.Decimal('12000.00'),
  };

  const mockPrismaService = {
    sale: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    loan: {
      findMany: jest.fn(),
    },
  };

  const mockMonthlyClosingsService = {
    getOfficialOrPreview: jest.fn(),
    getDateRange: jest.fn().mockImplementation((year: number, month: number) => {
      const referenceMonth = `${year}-${String(month).padStart(2, '0')}`;
      return {
        referenceMonth,
        startDate: new Date(Date.UTC(year, month - 1, 1)),
        endDate: new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)),
      };
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonthlyClosingsService, useValue: mockMonthlyClosingsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getSummary', () => {
    it('deve retornar resumo de mês aberto utilizando cálculo de preview', async () => {
      mockMonthlyClosingsService.getOfficialOrPreview.mockResolvedValueOnce({
        isOfficial: false,
        referenceMonth: '2026-09',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        closing: null,
        metrics: mockMonthlyMetrics,
      });

      // Mês anterior (2026-08) com valores para comparação
      mockMonthlyClosingsService.getOfficialOrPreview.mockResolvedValueOnce({
        isOfficial: true,
        referenceMonth: '2026-08',
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
        closing: { id: 'c1', version: 1, status: ClosingStatus.OFFICIAL },
        metrics: {
          ...mockMonthlyMetrics,
          grossRevenue: new Prisma.Decimal('10000.00'),
          grossProfit: new Prisma.Decimal('5000.00'),
          operatingResult: new Prisma.Decimal('4000.00'),
          netCashFlow: new Prisma.Decimal('6000.00'),
        },
      });

      const result = await service.getSummary({ year: 2026, month: 9 });

      expect(result.period.referenceMonth).toBe('2026-09');
      expect(result.closing.isClosed).toBe(false);
      expect(result.closing.version).toBeNull();
      expect(result.economic.grossRevenue).toBe('15000.00');
      expect(result.economic.operatingResult).toBe('5350.00');
      expect(result.cashFlow.netCashFlow).toBe('8000.00');

      // Comparação com mês anterior
      expect(result.comparisonWithPreviousMonth.previousReferenceMonth).toBe('2026-08');
      expect(result.comparisonWithPreviousMonth.grossRevenue.current).toBe('15000.00');
      expect(result.comparisonWithPreviousMonth.grossRevenue.previous).toBe('10000.00');
      expect(result.comparisonWithPreviousMonth.grossRevenue.absoluteChange).toBe('5000.00');
      expect(result.comparisonWithPreviousMonth.grossRevenue.percentageChange).toBe(50.0);
    });

    it('deve retornar snapshot oficial idêntico ao fechamento quando o mês estiver fechado', async () => {
      mockMonthlyClosingsService.getOfficialOrPreview.mockResolvedValueOnce({
        isOfficial: true,
        referenceMonth: '2026-09',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        closing: {
          id: 'closing-123',
          version: 2,
          status: ClosingStatus.OFFICIAL,
          closedAt: new Date('2026-09-24T00:00:00Z'),
        },
        metrics: mockMonthlyMetrics,
      });

      // Mês anterior com receita zero para testar divisão por zero
      mockMonthlyClosingsService.getOfficialOrPreview.mockResolvedValueOnce({
        isOfficial: true,
        referenceMonth: '2026-08',
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
        closing: null,
        metrics: {
          ...mockMonthlyMetrics,
          grossRevenue: new Prisma.Decimal('0.00'),
        },
      });

      const result = await service.getSummary({ year: 2026, month: 9 });

      expect(result.closing.isClosed).toBe(true);
      expect(result.closing.version).toBe(2);
      expect(result.closing.status).toBe(ClosingStatus.OFFICIAL);

      // Verificação de ausência de divisão por zero quando previous = 0
      expect(result.comparisonWithPreviousMonth.grossRevenue.percentageChange).toBeNull();
      expect(result.comparisonWithPreviousMonth.grossRevenue.absoluteChange).toBe('15000.00');
    });
  });

  describe('getSalesMetrics', () => {
    it('deve calcular métricas de vendas e produtos mais vendidos usando snapshots de SaleItem', async () => {
      const mockSales = [
        {
          id: 'sale-1',
          totalAmount: new Prisma.Decimal('100.00'),
          status: SaleStatus.COMPLETED,
          items: [
            {
              productId: 'prod-1',
              quantity: new Prisma.Decimal('2'),
              unitPrice: new Prisma.Decimal('30.00'),
              subtotal: new Prisma.Decimal('60.00'),
              unitCost: new Prisma.Decimal('15.00'),
              totalCost: new Prisma.Decimal('30.00'),
              product: { id: 'prod-1', name: 'Bebida A', sku: 'BEB-A', unit: 'UN' },
            },
            {
              productId: 'prod-2',
              quantity: new Prisma.Decimal('1'),
              unitPrice: new Prisma.Decimal('40.00'),
              subtotal: new Prisma.Decimal('40.00'),
              unitCost: new Prisma.Decimal('20.00'),
              totalCost: new Prisma.Decimal('20.00'),
              product: { id: 'prod-2', name: 'Snack B', sku: 'SNA-B', unit: 'UN' },
            },
          ],
        },
      ];

      mockPrismaService.sale.findMany.mockResolvedValue(mockSales);
      mockPrismaService.sale.count.mockResolvedValue(1); // 1 venda cancelada no período

      const result = await service.getSalesMetrics({ year: 2026, month: 9 });

      expect(result.salesSummary.completedSalesCount).toBe(1);
      expect(result.salesSummary.canceledSalesCount).toBe(1);
      expect(result.salesSummary.grossRevenue).toBe('100.00');
      expect(result.salesSummary.cogs).toBe('50.00');
      expect(result.salesSummary.grossProfit).toBe('50.00');
      expect(result.salesSummary.averageTicket).toBe('100.00');

      // Top produtos
      expect(result.topProducts.byRevenue[0].name).toBe('Bebida A');
      expect(result.topProducts.byRevenue[0].revenue).toBe('60.00');
      expect(result.topProducts.byRevenue[0].grossProfit).toBe('30.00');
    });
  });

  describe('getInventoryMetrics', () => {
    it('deve listar estoque físico ativo, excluindo serviços, e classificar saldos zerados e baixos', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Produto Zerado',
          sku: 'ZER-1',
          unit: 'UN',
          currentStock: new Prisma.Decimal('0'),
          averageCost: new Prisma.Decimal('10.00'),
        },
        {
          id: 'p2',
          name: 'Produto Baixo Estoque',
          sku: 'LOW-2',
          unit: 'UN',
          currentStock: new Prisma.Decimal('3'),
          averageCost: new Prisma.Decimal('20.00'),
        },
        {
          id: 'p3',
          name: 'Produto Normal',
          sku: 'NORM-3',
          unit: 'UN',
          currentStock: new Prisma.Decimal('50'),
          averageCost: new Prisma.Decimal('5.00'),
        },
      ]);

      const result = await service.getInventoryMetrics({ lowStockLimit: 5 });

      expect(result.activePhysicalProductsCount).toBe(3);
      expect(result.totalStockValue).toBe('310.00'); // (0*10) + (3*20) + (50*5) = 60 + 250 = 310
      expect(result.zeroStockCount).toBe(1);
      expect(result.zeroStockItems[0].name).toBe('Produto Zerado');
      expect(result.lowStockCount).toBe(1);
      expect(result.lowStockItems[0].name).toBe('Produto Baixo Estoque');
      expect(result.lowestStockItems.length).toBe(3);
    });
  });

  describe('getDebtMetrics', () => {
    it('deve calcular saldo devedor principal e parcelas vencidas derivadas', async () => {
      const pastDate = new Date('2026-08-10T00:00:00Z');
      const futureDate = new Date('2026-10-15T00:00:00Z');

      mockPrismaService.loan.findMany.mockResolvedValue([
        {
          id: 'loan-1',
          lenderName: 'Banco ABC',
          description: 'Capital de giro',
          principalAmount: new Prisma.Decimal('20000.00'),
          totalPayable: new Prisma.Decimal('24000.00'),
          remainingPrincipal: new Prisma.Decimal('15000.00'),
          installments: 12,
          startDate: new Date('2026-01-01'),
          status: 'ACTIVE',
          installmentsList: [
            {
              id: 'inst-1',
              loanId: 'loan-1',
              installmentNumber: 8,
              dueDate: pastDate, // Vencida
              expectedAmount: new Prisma.Decimal('2000.00'),
              paidAmount: new Prisma.Decimal('500.00'),
              status: 'PARTIALLY_PAID',
            },
            {
              id: 'inst-2',
              loanId: 'loan-1',
              installmentNumber: 9,
              dueDate: futureDate, // Futura
              expectedAmount: new Prisma.Decimal('2000.00'),
              paidAmount: new Prisma.Decimal('0.00'),
              status: 'PENDING',
            },
          ],
        },
      ]);

      const result = await service.getDebtMetrics();

      expect(result.activeLoansCount).toBe(1);
      expect(result.totalOriginalPrincipal).toBe('20000.00');
      expect(result.totalRemainingPrincipal).toBe('15000.00');
      expect(result.overdueInstallmentsCount).toBe(1);
      expect(result.totalOverdueAmount).toBe('1500.00'); // 2000 - 500
      expect(result.upcomingInstallments.length).toBe(1);
      expect(result.upcomingInstallments[0].installmentNumber).toBe(9);
    });
  });

  describe('getCashFlowSeries & getTrendsSeries', () => {
    it('deve retornar séries temporais mensais', async () => {
      mockMonthlyClosingsService.getOfficialOrPreview.mockResolvedValue({
        isOfficial: true,
        referenceMonth: '2026-09',
        metrics: mockMonthlyMetrics,
      });

      const cashFlow = await service.getCashFlowSeries({ months: 3, year: 2026, month: 9 });
      expect(cashFlow.length).toBe(3);
      expect(cashFlow[0]).toHaveProperty('inflows');
      expect(cashFlow[0]).toHaveProperty('outflows');
      expect(cashFlow[0]).toHaveProperty('netCashFlow');

      const trends = await service.getTrendsSeries({ months: 3, year: 2026, month: 9 });
      expect(trends.length).toBe(3);
      expect(trends[0]).toHaveProperty('grossRevenue');
      expect(trends[0]).toHaveProperty('grossProfit');
      expect(trends[0]).toHaveProperty('operatingResult');
      expect(trends[0]).toHaveProperty('netCashFlow');
    });
  });

  describe('Validação de DTOs e Parâmetros', () => {
    it('deve rejeitar month fora do intervalo de 1 a 12 ou year fora do range em QueryDashboardDto', async () => {
      const { plainToInstance } = await import('class-transformer');
      const { validate } = await import('class-validator');
      const { QueryDashboardDto } = await import('./dto/query-dashboard.dto');

      const invalidMonth = plainToInstance(QueryDashboardDto, { year: 2026, month: 13 });
      const errorsMonth = await validate(invalidMonth);
      expect(errorsMonth.length).toBeGreaterThan(0);
      expect(errorsMonth[0].property).toBe('month');

      const invalidYear = plainToInstance(QueryDashboardDto, { year: 1999, month: 5 });
      const errorsYear = await validate(invalidYear);
      expect(errorsYear.length).toBeGreaterThan(0);
      expect(errorsYear[0].property).toBe('year');
    });

    it('deve rejeitar months fora do intervalo de 1 a 24 em QueryRangeDashboardDto', async () => {
      const { plainToInstance } = await import('class-transformer');
      const { validate } = await import('class-validator');
      const { QueryRangeDashboardDto } = await import('./dto/query-range-dashboard.dto');

      const zeroMonths = plainToInstance(QueryRangeDashboardDto, { months: 0 });
      const errorsZero = await validate(zeroMonths);
      expect(errorsZero.length).toBeGreaterThan(0);
      expect(errorsZero[0].property).toBe('months');

      const excessMonths = plainToInstance(QueryRangeDashboardDto, { months: 25 });
      const errorsExcess = await validate(excessMonths);
      expect(errorsExcess.length).toBeGreaterThan(0);
      expect(errorsExcess[0].property).toBe('months');
    });

    it('deve rejeitar lowStockLimit negativo em QueryInventoryDashboardDto', async () => {
      const { plainToInstance } = await import('class-transformer');
      const { validate } = await import('class-validator');
      const { QueryInventoryDashboardDto } = await import('./dto/query-inventory-dashboard.dto');

      const negativeLimit = plainToInstance(QueryInventoryDashboardDto, { lowStockLimit: -1 });
      const errors = await validate(negativeLimit);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lowStockLimit');
    });
  });
});

