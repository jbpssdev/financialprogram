import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  DashboardCashFlowPoint,
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
  DashboardTrendsPoint,
} from './dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getSummary(year: number, month: number): Observable<DashboardSummaryResponse> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<DashboardSummaryResponse>(`${this.apiBaseUrl}/dashboard/summary`, {
      params,
    });
  }

  getSales(year: number, month: number): Observable<DashboardSalesResponse> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<DashboardSalesResponse>(`${this.apiBaseUrl}/dashboard/sales`, {
      params,
    });
  }

  getInventory(lowStockLimit: number = 5): Observable<DashboardInventoryResponse> {
    const params = new HttpParams().set('lowStockLimit', lowStockLimit.toString());

    return this.http.get<DashboardInventoryResponse>(`${this.apiBaseUrl}/dashboard/inventory`, {
      params,
    });
  }

  getDebt(): Observable<DashboardDebtResponse> {
    return this.http.get<DashboardDebtResponse>(`${this.apiBaseUrl}/dashboard/debt`);
  }

  getCashFlow(months: number = 6, year?: number, month?: number): Observable<DashboardCashFlowPoint[]> {
    let params = new HttpParams().set('months', months.toString());
    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }
    if (month !== undefined && month !== null) {
      params = params.set('month', month.toString());
    }

    return this.http.get<DashboardCashFlowPoint[]>(`${this.apiBaseUrl}/dashboard/cash-flow`, {
      params,
    });
  }

  getTrends(months: number = 6, year?: number, month?: number): Observable<DashboardTrendsPoint[]> {
    let params = new HttpParams().set('months', months.toString());
    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }
    if (month !== undefined && month !== null) {
      params = params.set('month', month.toString());
    }

    return this.http.get<DashboardTrendsPoint[]>(`${this.apiBaseUrl}/dashboard/trends`, {
      params,
    });
  }
}

