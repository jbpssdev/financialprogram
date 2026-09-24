import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse, AuthUser, LoginRequest } from './auth.models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  const testApiUrl = 'http://localhost:3000/api/v1';

  const mockUser: AuthUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@empresa.com',
    isActive: true,
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'test-access-token',
    user: mockUser,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: testApiUrl },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('login: should POST to /auth/login with body and withCredentials=true', () => {
    const creds: LoginRequest = { email: 'admin@empresa.com', password: 'password123' };

    service.login(creds).subscribe((res) => {
      expect(res).toEqual(mockAuthResponse);
    });

    const req = httpTesting.expectOne(`${testApiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(creds);
    expect(req.request.withCredentials).toBe(true);

    req.flush(mockAuthResponse);
  });

  it('refresh: should POST to /auth/refresh with withCredentials=true', () => {
    service.refresh().subscribe((res) => {
      expect(res).toEqual(mockAuthResponse);
    });

    const req = httpTesting.expectOne(`${testApiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.withCredentials).toBe(true);

    req.flush(mockAuthResponse);
  });

  it('refresh single-flight: should deduplicate multiple concurrent refresh calls into exactly 1 HTTP request', () => {
    let call1Result: AuthResponse | undefined;
    let call2Result: AuthResponse | undefined;

    service.refresh().subscribe((res) => {
      call1Result = res;
    });

    service.refresh().subscribe((res) => {
      call2Result = res;
    });

    // Exactly one HTTP request is initiated
    const req = httpTesting.expectOne(`${testApiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');

    req.flush(mockAuthResponse);

    expect(call1Result).toEqual(mockAuthResponse);
    expect(call2Result).toEqual(mockAuthResponse);
  });

  it('logout: should POST to /auth/logout with withCredentials=true', () => {
    service.logout().subscribe();

    const req = httpTesting.expectOne(`${testApiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);

    req.flush({});
  });

  it('me: should GET /auth/me', () => {
    service.me().subscribe((user) => {
      expect(user).toEqual(mockUser);
    });

    const req = httpTesting.expectOne(`${testApiUrl}/auth/me`);
    expect(req.request.method).toBe('GET');

    req.flush(mockUser);
  });
});
