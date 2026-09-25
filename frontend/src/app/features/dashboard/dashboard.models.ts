export interface MetricComparison {
  current: string;
  previous: string;
  absoluteChange: string;
  percentageChange: number | null;
}

export interface DashboardPeriod {
  year: number;
  month: number;
  referenceMonth: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardClosing {
  isClosed: boolean;
  version: number | null;
  status: string | null;
  closedAt: string | null;
}

export interface DashboardEconomicMetrics {
  grossRevenue: string;
  cogs: string;
  grossProfit: string;
  otherIncomes: string;
  businessExpenses: string;
  loanInterestExpense: string;
  operatingResult: string;
  personalExpenses: string;
  resultAfterPersonalExpenses: string;
}

export interface DashboardCashFlowMetrics {
  salesCashCollected: string;
  otherIncomesCollected: string;
  loanProceeds: string;
  purchasePayments: string;
  businessExpensesPaid: string;
  personalExpensesPaid: string;
  loanPaymentsTotal: string;
  totalInflows: string;
  totalOutflows: string;
  netCashFlow: string;
}

export interface DashboardPositionMetrics {
  stockValue: string;
  totalDebtRemaining: string;
}

export interface DashboardSummaryResponse {
  period: DashboardPeriod;
  closing: DashboardClosing;
  economic: DashboardEconomicMetrics;
  cashFlow: DashboardCashFlowMetrics;
  position: DashboardPositionMetrics;
  comparisonWithPreviousMonth: {
    previousReferenceMonth: string;
    grossRevenue: MetricComparison;
    grossProfit: MetricComparison;
    operatingResult: MetricComparison;
    netCashFlow: MetricComparison;
  };
}

export interface DashboardSalesProduct {
  productId: string;
  name: string;
  unitOfMeasure: string;
  quantitySold: string;
  revenue: string;
  cogs: string;
  grossProfit: string;
}

export interface DashboardSalesSummary {
  completedSalesCount: number;
  canceledSalesCount: number;
  grossRevenue: string;
  cogs: string;
  grossProfit: string;
  averageTicket: string;
}

export interface DashboardSalesResponse {
  period: DashboardPeriod;
  salesSummary: DashboardSalesSummary;
  topProducts: {
    byRevenue: DashboardSalesProduct[];
    byQuantity: DashboardSalesProduct[];
    byGrossProfit: DashboardSalesProduct[];
  };
}

export interface DashboardInventoryItem {
  id: string;
  name: string;
  unitOfMeasure: string;
  currentStock: string;
  averageCost: string;
  totalValue: string;
}

export interface DashboardInventoryResponse {
  activePhysicalProductsCount: number;
  totalStockValue: string;
  lowStockThreshold: number;
  zeroStockCount: number;
  lowStockCount: number;
  zeroStockItems: DashboardInventoryItem[];
  lowStockItems: DashboardInventoryItem[];
  lowestStockItems: DashboardInventoryItem[];
}

export interface DashboardDebtInstallment {
  installmentId: string;
  loanId: string;
  lenderName: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
}

export interface DashboardActiveLoan {
  id: string;
  lenderName: string;
  description: string | null;
  principalAmount: string;
  totalPayable: string;
  remainingPrincipal: string;
  installments: number;
  status: string;
  startDate: string;
}

export interface DashboardDebtResponse {
  totalOriginalPrincipal: string;
  totalRemainingPrincipal: string;
  activeLoansCount: number;
  overdueInstallmentsCount: number;
  totalOverdueAmount: string;
  overdueInstallments: DashboardDebtInstallment[];
  upcomingInstallments: DashboardDebtInstallment[];
  activeLoans: DashboardActiveLoan[];
}

export interface DashboardCashFlowPoint {
  referenceMonth: string;
  isClosed: boolean;
  inflows: string;
  outflows: string;
  netCashFlow: string;
}

export type DashboardCashFlowResponse = DashboardCashFlowPoint[];

export interface DashboardTrendsPoint {
  referenceMonth: string;
  isClosed: boolean;
  grossRevenue: string;
  grossProfit: string;
  operatingResult: string;
  netCashFlow: string;
}

export type DashboardTrendsResponse = DashboardTrendsPoint[];
