import {
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
} from './dashboard.models';

export function createDummySummary(overrides: Partial<DashboardSummaryResponse> = {}): DashboardSummaryResponse {
  return {
    period: {
      year: 2026,
      month: 9,
      referenceMonth: '2026-09',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-10-01T00:00:00.000Z',
    },
    closing: {
      isClosed: false,
      version: null,
      status: null,
      closedAt: null,
    },
    economic: {
      grossRevenue: '15000.00',
      cogs: '6000.00',
      grossProfit: '9000.00',
      otherIncomes: '500.00',
      businessExpenses: '3000.00',
      loanInterestExpense: '200.00',
      operatingResult: '6300.00',
      personalExpenses: '2000.00',
      resultAfterPersonalExpenses: '4300.00',
    },
    cashFlow: {
      salesCashCollected: '14000.00',
      otherIncomesCollected: '500.00',
      loanProceeds: '0.00',
      purchasePayments: '5000.00',
      businessExpensesPaid: '2800.00',
      personalExpensesPaid: '2000.00',
      loanPaymentsTotal: '1000.00',
      totalInflows: '14500.00',
      totalOutflows: '10800.00',
      netCashFlow: '3700.00',
    },
    position: {
      stockValue: '25000.00',
      totalDebtRemaining: '18000.00',
    },
    comparisonWithPreviousMonth: {
      previousReferenceMonth: '2026-08',
      grossRevenue: { current: '15000.00', previous: '12000.00', absoluteChange: '3000.00', percentageChange: 25.0 },
      grossProfit: { current: '9000.00', previous: '7500.00', absoluteChange: '1500.00', percentageChange: 20.0 },
      operatingResult: { current: '6300.00', previous: '5000.00', absoluteChange: '1300.00', percentageChange: 26.0 },
      netCashFlow: { current: '3700.00', previous: '0.00', absoluteChange: '3700.00', percentageChange: null },
    },
    ...overrides,
  };
}

export function createDummySales(overrides: Partial<DashboardSalesResponse> = {}): DashboardSalesResponse {
  return {
    period: {
      year: 2026,
      month: 9,
      referenceMonth: '2026-09',
    },
    salesSummary: {
      completedSalesCount: 42,
      canceledSalesCount: 1,
      grossRevenue: '15000.00',
      cogs: '6000.00',
      grossProfit: '9000.00',
      averageTicket: '357.14',
    },
    topProducts: {
      byRevenue: [
        {
          productId: 'prod-1',
          name: 'Produto Alpha',
          unitOfMeasure: 'UN',
          quantitySold: '50.000',
          revenue: '7500.00',
          cogs: '3000.00',
          grossProfit: '4500.00',
        },
      ],
      byQuantity: [],
      byGrossProfit: [],
    },
    ...overrides,
  };
}

export function createDummyInventory(overrides: Partial<DashboardInventoryResponse> = {}): DashboardInventoryResponse {
  return {
    activePhysicalProductsCount: 12,
    totalStockValue: '25000.00',
    lowStockThreshold: 5,
    zeroStockCount: 1,
    lowStockCount: 2,
    zeroStockItems: [
      {
        id: 'p-0',
        name: 'Item Zerado',
        unitOfMeasure: 'UN',
        currentStock: '0.000',
        averageCost: '25.0000',
        totalValue: '0.00',
      },
    ],
    lowStockItems: [
      {
        id: 'p-low',
        name: 'Item Crítico',
        unitOfMeasure: 'KG',
        currentStock: '2.500',
        averageCost: '10.0000',
        totalValue: '25.00',
      },
    ],
    lowestStockItems: [],
    ...overrides,
  };
}

export function createDummyDebt(overrides: Partial<DashboardDebtResponse> = {}): DashboardDebtResponse {
  return {
    totalOriginalPrincipal: '30000.00',
    totalRemainingPrincipal: '18000.00',
    activeLoansCount: 2,
    overdueInstallmentsCount: 1,
    totalOverdueAmount: '1200.00',
    overdueInstallments: [
      {
        installmentId: 'inst-overdue',
        loanId: 'loan-1',
        lenderName: 'Banco do Brasil',
        installmentNumber: 3,
        dueDate: '2026-09-01',
        expectedAmount: '1200.00',
        paidAmount: '0.00',
        remainingAmount: '1200.00',
        status: 'OPEN',
      },
    ],
    upcomingInstallments: [
      {
        installmentId: 'inst-next',
        loanId: 'loan-1',
        lenderName: 'Banco do Brasil',
        installmentNumber: 4,
        dueDate: '2026-10-01',
        expectedAmount: '1200.00',
        paidAmount: '0.00',
        remainingAmount: '1200.00',
        status: 'OPEN',
      },
    ],
    activeLoans: [
      {
        id: 'loan-1',
        lenderName: 'Banco do Brasil',
        description: 'Capital de Giro',
        principalAmount: '30000.00',
        totalPayable: '36000.00',
        remainingPrincipal: '18000.00',
        installments: 12,
        status: 'ACTIVE',
        startDate: '2026-01-10',
      },
    ],
    ...overrides,
  };
}

export function createDummyCashFlowSeries(): import('./dashboard.models').DashboardCashFlowPoint[] {
  return [
    {
      referenceMonth: '2026-04',
      isClosed: true,
      inflows: '12000.00',
      outflows: '9000.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-05',
      isClosed: true,
      inflows: '14000.00',
      outflows: '11000.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-06',
      isClosed: true,
      inflows: '13500.00',
      outflows: '10500.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-07',
      isClosed: true,
      inflows: '15000.00',
      outflows: '12000.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-08',
      isClosed: true,
      inflows: '16000.00',
      outflows: '13000.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-09',
      isClosed: false,
      inflows: '14500.00',
      outflows: '10800.00',
      netCashFlow: '3700.00',
    },
  ];
}

export function createDummyTrendsSeries(): import('./dashboard.models').DashboardTrendsPoint[] {
  return [
    {
      referenceMonth: '2026-04',
      isClosed: true,
      grossRevenue: '13000.00',
      grossProfit: '7800.00',
      operatingResult: '5200.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-05',
      isClosed: true,
      grossRevenue: '14000.00',
      grossProfit: '8400.00',
      operatingResult: '5600.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-06',
      isClosed: true,
      grossRevenue: '13800.00',
      grossProfit: '8200.00',
      operatingResult: '5400.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-07',
      isClosed: true,
      grossRevenue: '15200.00',
      grossProfit: '9100.00',
      operatingResult: '6100.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-08',
      isClosed: true,
      grossRevenue: '16500.00',
      grossProfit: '9900.00',
      operatingResult: '6800.00',
      netCashFlow: '3000.00',
    },
    {
      referenceMonth: '2026-09',
      isClosed: false,
      grossRevenue: '15000.00',
      grossProfit: '9000.00',
      operatingResult: '6300.00',
      netCashFlow: '3700.00',
    },
  ];
}

