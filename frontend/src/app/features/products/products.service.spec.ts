import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  UpdateCategoryDto,
  UpdateProductDto,
} from './products.models';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpTesting: HttpTestingController;
  const mockApiUrl = 'http://test-api/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: mockApiUrl },
      ],
    });

    service = TestBed.inject(ProductsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('Products HTTP', () => {
    it('should call GET /products with activeOnly param when specified', () => {
      service.getProducts(true).subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/products?activeOnly=true`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should call GET /products without params by default', () => {
      service.getProducts().subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/products`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should call GET /products/:id', () => {
      service.getProduct('prod-123').subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/products/prod-123`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'prod-123', name: 'Test Product' });
    });

    it('should call POST /products with CreateProductDto', () => {
      const dto: CreateProductDto = {
        categoryId: 'cat-1',
        name: 'Suco Natural',
        currentPrice: 8.5,
        type: 'PRODUCT_STOCK',
        unitOfMeasure: 'UNIT',
      };

      service.createProduct(dto).subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/products`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: 'prod-1', ...dto });
    });

    it('should call PATCH /products/:id with UpdateProductDto', () => {
      const dto: UpdateProductDto = {
        currentPrice: 9.9,
      };

      service.updateProduct('prod-1', dto).subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/products/prod-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: 'prod-1', ...dto });
    });
  });

  describe('Categories HTTP', () => {
    it('should call GET /categories with activeOnly param when specified', () => {
      service.getCategories(true).subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/categories?activeOnly=true`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should call GET /categories without params by default', () => {
      service.getCategories().subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/categories`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should call GET /categories/:id', () => {
      service.getCategory('cat-1').subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/categories/cat-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'cat-1', name: 'Bebidas' });
    });

    it('should call POST /categories with CreateCategoryDto', () => {
      const dto: CreateCategoryDto = {
        name: 'Bebidas Artesanais',
        description: 'Cervejas e drinks',
      };

      service.createCategory(dto).subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/categories`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: 'cat-1', ...dto, isActive: true });
    });

    it('should call PATCH /categories/:id with UpdateCategoryDto', () => {
      const dto: UpdateCategoryDto = {
        isActive: false,
      };

      service.updateCategory('cat-1', dto).subscribe();

      const req = httpTesting.expectOne(`${mockApiUrl}/categories/cat-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: 'cat-1', isActive: false });
    });
  });
});
