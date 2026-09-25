import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from './suppliers.models';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SuppliersService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });

    service = TestBed.inject(SuppliersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all suppliers via GET /suppliers', () => {
    const mockList: Supplier[] = [
      {
        id: 'sup-1',
        name: 'Distribuidora Central Ltda',
        contactName: 'Carlos Silva',
        phone: '11999998888',
        email: 'contato@central.com',
        notes: 'Entrega às terças',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    service.getSuppliers().subscribe((res) => {
      expect(res).toEqual(mockList);
    });

    const req = httpMock.expectOne(`${baseUrl}/suppliers`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('activeOnly')).toBe(false);
    req.flush(mockList);
  });

  it('should pass activeOnly query when requested', () => {
    service.getSuppliers(true).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/suppliers?activeOnly=true`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch single supplier via GET /suppliers/:id', () => {
    const mockSupplier: Supplier = {
      id: 'sup-1',
      name: 'Distribuidora Central Ltda',
      contactName: null,
      phone: null,
      email: null,
      notes: null,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      _count: { purchases: 5 },
    };

    service.getSupplier('sup-1').subscribe((res) => {
      expect(res).toEqual(mockSupplier);
    });

    const req = httpMock.expectOne(`${baseUrl}/suppliers/sup-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSupplier);
  });

  it('should create supplier via POST /suppliers', () => {
    const dto: CreateSupplierDto = {
      name: 'Novo Fornecedor',
      contactName: 'Mariana',
      phone: '11988887777',
      email: 'mariana@fornecedor.com',
    };

    const mockCreated: Supplier = {
      id: 'sup-new',
      name: dto.name,
      contactName: dto.contactName ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      notes: null,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    service.createSupplier(dto).subscribe((res) => {
      expect(res).toEqual(mockCreated);
    });

    const req = httpMock.expectOne(`${baseUrl}/suppliers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockCreated);
  });

  it('should update supplier via PATCH /suppliers/:id', () => {
    const dto: UpdateSupplierDto = {
      name: 'Nome Atualizado',
      isActive: false,
    };

    const mockUpdated: Supplier = {
      id: 'sup-1',
      name: 'Nome Atualizado',
      contactName: null,
      phone: null,
      email: null,
      notes: null,
      isActive: false,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    service.updateSupplier('sup-1', dto).subscribe((res) => {
      expect(res).toEqual(mockUpdated);
    });

    const req = httpMock.expectOne(`${baseUrl}/suppliers/sup-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush(mockUpdated);
  });
});
