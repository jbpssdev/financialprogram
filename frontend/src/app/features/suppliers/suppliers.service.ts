import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from './suppliers.models';

@Injectable({
  providedIn: 'root',
})
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * Retrieves list of suppliers, optionally filtered by active status.
   * GET /api/v1/suppliers
   */
  getSuppliers(activeOnly = false): Observable<Supplier[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }
    return this.http.get<Supplier[]>(`${this.apiBaseUrl}/suppliers`, { params });
  }

  /**
   * Retrieves details of a single supplier by ID including purchase count.
   * GET /api/v1/suppliers/:id
   */
  getSupplier(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.apiBaseUrl}/suppliers/${id}`);
  }

  /**
   * Registers a new supplier.
   * POST /api/v1/suppliers
   */
  createSupplier(dto: CreateSupplierDto): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.apiBaseUrl}/suppliers`, dto);
  }

  /**
   * Updates an existing supplier or toggles active status.
   * PATCH /api/v1/suppliers/:id
   */
  updateSupplier(id: string, dto: UpdateSupplierDto): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.apiBaseUrl}/suppliers/${id}`, dto);
  }
}
