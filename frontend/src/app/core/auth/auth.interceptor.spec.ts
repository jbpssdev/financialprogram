import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { authInterceptor, IS_AUTH_RETRY, resetRefreshInFlight } from './auth.interceptor';
import { AuthResponse, AuthUser } from './auth.models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authStore: AuthStore;
  let authServiceSpy: {
    refresh: ReturnType<typeof vi.fn>;
  };
  let routerSpy: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const testApiUrl = 'http://localhost:3000/api/v1';

  const mockUser: AuthUser = {
    id: 'user-99',
    name: 'Test Analyst',
    email: 'analyst@empresa.com',
    isActive: true,
  };

  const refreshedAuthResponse: AuthResponse = {
    accessToken: 'new-refreshed-token-abc',
    user: mockUser,
  };

  beforeEach(() => {
    resetRefreshInFlight();

    authServiceSpy = {
      refresh: vi.fn(),
    };
    routerSpy = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: API_BASE_URL, useValue: testApiUrl },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    httpTesting.verify();
    resetRefreshInFlight();
    TestBed.resetTestingModule();
  });

  it('H - Protected request with token: should add Authorization Bearer header', () => {
    authStore.setSession('valid-jwt-token', mockUser);

    http.get(`${testApiUrl}/dashboard/summary`).subscribe();

    const req = httpTesting.expectOne(`${testApiUrl}/dashboard/summary`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    req.flush({});
  });

  it('I - Login request: should NOT add Authorization header even if token exists in store', () => {
    authStore.setSession('existing-token', mockUser);

    http.post(`${testApiUrl}/auth/login`, { email: 'admin@empresa.com', password: '123' }).subscribe();

    const req = httpTesting.expectOne(`${testApiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('J - Refresh request: should enforce withCredentials=true and NOT add Bearer', () => {
    authStore.setSession('existing-token', mockUser);

    http.post(`${testApiUrl}/auth/refresh`, {}).subscribe();

    const req = httpTesting.expectOne(`${testApiUrl}/auth/refresh`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('K - Protected request returning 401: should trigger refresh and retry request with new token', async () => {
    authStore.setSession('expired-token', mockUser);
    authServiceSpy.refresh.mockReturnValue(of(refreshedAuthResponse));

    let finalResponse: unknown;
    http.get(`${testApiUrl}/sales`).subscribe((res) => {
      finalResponse = res;
    });

    // 1. Initial request fails with 401
    const req1 = httpTesting.expectOne(`${testApiUrl}/sales`);
    expect(req1.request.headers.get('Authorization')).toBe('Bearer expired-token');
    req1.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    // 2. Refresh was called
    expect(authServiceSpy.refresh).toHaveBeenCalledTimes(1);

    // 3. Retried request with new refreshed token
    const retryReq = httpTesting.expectOne(`${testApiUrl}/sales`);
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-refreshed-token-abc');
    expect(retryReq.request.context.get(IS_AUTH_RETRY)).toBe(true);
    retryReq.flush([{ id: 'sale-1', amount: 500 }]);

    expect(finalResponse).toEqual([{ id: 'sale-1', amount: 500 }]);
    expect(authStore.accessToken()).toBe('new-refreshed-token-abc');
  });

  it('L - 5 concurrent protected requests receiving 401: should execute only 1 refresh call', async () => {
    authStore.setSession('expired-token', mockUser);
    const refreshSubject = new Subject<AuthResponse>();
    authServiceSpy.refresh.mockReturnValue(refreshSubject.asObservable());

    const results: unknown[] = [];
    const endpoints = ['/sales', '/expenses', '/incomes', '/loans', '/inventory'];

    endpoints.forEach((ep) => {
      http.get(`${testApiUrl}${ep}`).subscribe((res) => results.push(res));
    });

    // All 5 initial requests arrive
    const reqs = endpoints.map((ep) => httpTesting.expectOne(`${testApiUrl}${ep}`));

    // All 5 fail with 401 simultaneously
    reqs.forEach((r) => r.flush({}, { status: 401, statusText: 'Unauthorized' }));

    // Single-flight guarantee: refresh was only invoked ONCE
    expect(authServiceSpy.refresh).toHaveBeenCalledTimes(1);

    // Now emit the refreshed token from the single refresh call
    refreshSubject.next(refreshedAuthResponse);
    refreshSubject.complete();

    // All 5 retry requests arrive with the new token
    const retryReqs = endpoints.map((ep) => httpTesting.expectOne(`${testApiUrl}${ep}`));
    retryReqs.forEach((r, idx) => {
      expect(r.request.headers.get('Authorization')).toBe('Bearer new-refreshed-token-abc');
      r.flush({ data: idx });
    });

    expect(results.length).toBe(5);
  });

  it('M - Refresh failure on 401: should clear session, navigate to /login, and propagate error', () => {
    authStore.setSession('expired-token', mockUser);
    const refreshError = new HttpErrorResponse({ status: 401, statusText: 'Refresh Expired' });
    authServiceSpy.refresh.mockReturnValue(throwError(() => refreshError));

    let receivedError: unknown;
    http.get(`${testApiUrl}/sales`).subscribe({
      error: (err) => {
        receivedError = err;
      },
    });

    const req = httpTesting.expectOne(`${testApiUrl}/sales`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeDefined();
    expect(authStore.accessToken()).toBeNull();
    expect(authStore.user()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('N - Retry continues 401: should not enter infinite loop, should clear session and navigate to /login', () => {
    authStore.setSession('token-1', mockUser);
    authServiceSpy.refresh.mockReturnValue(of(refreshedAuthResponse));

    let finalError: unknown;
    http.get(`${testApiUrl}/sales`).subscribe({
      error: (err) => {
        finalError = err;
      },
    });

    // 1st request 401
    const req1 = httpTesting.expectOne(`${testApiUrl}/sales`);
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Retry request also fails with 401
    const retryReq = httpTesting.expectOne(`${testApiUrl}/sales`);
    retryReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Refresh was only called ONCE for the original request, NOT for the retry
    expect(authServiceSpy.refresh).toHaveBeenCalledTimes(1);
    expect(finalError).toBeDefined();
    expect(authStore.accessToken()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('O - External URLs: should not receive Authorization header even if user is logged in', () => {
    authStore.setSession('my-secret-jwt', mockUser);

    http.get('https://brasilapi.com.br/api/cnpj/v1/00000000000191').subscribe();

    const extReq = httpTesting.expectOne('https://brasilapi.com.br/api/cnpj/v1/00000000000191');
    expect(extReq.request.headers.has('Authorization')).toBe(false);
    extReq.flush({});
  });
});
