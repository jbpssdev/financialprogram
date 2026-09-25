import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  CreateStockAdjustmentDto,
  InventoryProduct,
  OpeningBalanceDto,
  OpeningBalanceResponse,
  StockAdjustmentResponse,
  StockMovement,
} from './inventory.models';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * Retrieves the inventory overview of all products with stock and valuation metrics.
   * GET /api/v1/inventory
   */
  getInventoryOverview(): Observable<InventoryProduct[]> {
    return this.http.get<InventoryProduct[]>(`${this.apiBaseUrl}/inventory`);
  }

  /**
   * Retrieves current inventory metrics for a specific product.
   * GET /api/v1/inventory/:productId
   */
  getProductInventory(productId: string): Observable<InventoryProduct> {
    return this.http.get<InventoryProduct>(`${this.apiBaseUrl}/inventory/${productId}`);
  }

  /**
   * Retrieves stock movement history for a product in descending chronological order.
   * GET /api/v1/inventory/:productId/movements
   */
  getProductMovements(productId: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.apiBaseUrl}/inventory/${productId}/movements`);
  }

  /**
   * Sets the initial opening balance for an existing product with zero movements.
   * POST /api/v1/inventory/opening-balance
   */
  setOpeningBalance(dto: OpeningBalanceDto): Observable<OpeningBalanceResponse> {
    return this.http.post<OpeningBalanceResponse>(`${this.apiBaseUrl}/inventory/opening-balance`, dto);
  }

  /**
   * Creates a manual stock adjustment (positive, negative, loss, or internal consumption).
   * POST /api/v1/inventory/adjustments
   */
  createAdjustment(dto: CreateStockAdjustmentDto): Observable<StockAdjustmentResponse> {
    return this.http.post<StockAdjustmentResponse>(`${this.apiBaseUrl}/inventory/adjustments`, dto);
  }
}
