import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://api.test/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        DashboardService,
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request summary with year and month query params', () => {
    service.getSummary(2026, 9).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/summary?year=2026&month=9`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should request sales with year and month query params', () => {
    service.getSales(2026, 9).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/sales?year=2026&month=9`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should request inventory with default lowStockLimit parameter', () => {
    service.getInventory().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/inventory?lowStockLimit=5`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should request inventory with custom lowStockLimit parameter', () => {
    service.getInventory(10).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/inventory?lowStockLimit=10`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should request debt metrics', () => {
    service.getDebt().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/debt`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should request cash-flow with months, year, and month params', () => {
    service.getCashFlow(12, 2026, 3).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/cash-flow?months=12&year=2026&month=3`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should request cash-flow with default months when no params provided', () => {
    service.getCashFlow().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/cash-flow?months=6`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should request trends with months, year, and month params', () => {
    service.getTrends(24, 2026, 9).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/trends?months=24&year=2026&month=9`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should request trends with default months when no params provided', () => {
    service.getTrends().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/trends?months=6`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

