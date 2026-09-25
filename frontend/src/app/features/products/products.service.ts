import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  UpdateCategoryDto,
  UpdateProductDto,
} from './products.models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  // ==========================================
  // PRODUCTS
  // ==========================================

  getProducts(activeOnly = false): Observable<Product[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }
    return this.http.get<Product[]>(`${this.apiBaseUrl}/products`, { params });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiBaseUrl}/products/${id}`);
  }

  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.apiBaseUrl}/products`, dto);
  }

  updateProduct(id: string, dto: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiBaseUrl}/products/${id}`, dto);
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  getCategories(activeOnly = false): Observable<Category[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }
    return this.http.get<Category[]>(`${this.apiBaseUrl}/categories`, { params });
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiBaseUrl}/categories/${id}`);
  }

  createCategory(dto: CreateCategoryDto): Observable<Category> {
    return this.http.post<Category>(`${this.apiBaseUrl}/categories`, dto);
  }

  updateCategory(id: string, dto: UpdateCategoryDto): Observable<Category> {
    return this.http.patch<Category>(`${this.apiBaseUrl}/categories/${id}`, dto);
  }
}
