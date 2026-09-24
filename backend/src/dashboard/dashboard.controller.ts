import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryInventoryDashboardDto } from './dto/query-inventory-dashboard.dto';
import { QueryRangeDashboardDto } from './dto/query-range-dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query() query: QueryDashboardDto) {
    return this.dashboardService.getSummary(query);
  }

  @Get('sales')
  getSalesMetrics(@Query() query: QueryDashboardDto) {
    return this.dashboardService.getSalesMetrics(query);
  }

  @Get('inventory')
  getInventoryMetrics(@Query() query: QueryInventoryDashboardDto) {
    return this.dashboardService.getInventoryMetrics(query);
  }

  @Get('debt')
  getDebtMetrics() {
    return this.dashboardService.getDebtMetrics();
  }

  @Get('cash-flow')
  getCashFlowSeries(@Query() query: QueryRangeDashboardDto) {
    return this.dashboardService.getCashFlowSeries(query);
  }

  @Get('trends')
  getTrendsSeries(@Query() query: QueryRangeDashboardDto) {
    return this.dashboardService.getTrendsSeries(query);
  }
}
