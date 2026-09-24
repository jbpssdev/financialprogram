import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest } from './auth.models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;
  let authServiceSpy: {
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    me: ReturnType<typeof vi.fn>;
  };
  let routerSpy: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const mockUser: AuthUser = {
    id: 'user-123',
    name: 'Admin User',
    email: 'admin@empresa.com',
    isActive: true,
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-access-token-xyz',
    user: mockUser,
  };

  beforeEach(() => {
    authServiceSpy = {
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
    };
    routerSpy = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it('A - should have clean initial state: user null, token null, initialized false', () => {
    expect(store.user()).toBeNull();
    expect(store.accessToken()).toBeNull();
    expect(store.initialized()).toBe(false);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('B - login success: should update user and token in memory, and set authenticated to true', async () => {
    authServiceSpy.login.mockReturnValue(of(mockAuthResponse));
    const credentials: LoginRequest = { email: 'admin@empresa.com', password: 'Password@123' };

    await new Promise<void>((resolve) => {
      store.login(credentials).subscribe({
        next: (res) => {
          expect(res).toEqual(mockAuthResponse);
          resolve();
        },
      });
    });

    expect(store.accessToken()).toBe('mock-access-token-xyz');
    expect(store.user()).toEqual(mockUser);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('C - login error: should keep user unauthenticated and set normalized error', async () => {
    const errorResponse = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    authServiceSpy.login.mockReturnValue(throwError(() => errorResponse));

    await new Promise<void>((resolve) => {
      store.login({ email: 'wrong@empresa.com', password: 'wrong' }).subscribe({
        error: () => {
          resolve();
        },
      });
    });

    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()).toBe('Credenciais inválidas.');
    expect(store.loading()).toBe(false);
  });

  it('D - logout: should clear in-memory tokens, clear user, and navigate to /login', async () => {
    store.setSession('temp-token', mockUser);
    expect(store.isAuthenticated()).toBe(true);

    authServiceSpy.logout.mockReturnValue(of(undefined));

    await new Promise<void>((resolve) => {
      store.logout().subscribe({
        next: () => resolve(),
      });
    });

    expect(store.accessToken()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('E - refresh success: should update accessToken and user via setSession', () => {
    const updatedUser: AuthUser = { ...mockUser, name: 'Updated Name' };
    store.setSession('new-rotated-token', updatedUser);

    expect(store.accessToken()).toBe('new-rotated-token');
    expect(store.user()?.name).toBe('Updated Name');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('F - restoreSession 401: should set initialized=true without treating 401 as a fatal error', async () => {
    const error401 = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    authServiceSpy.refresh.mockReturnValue(throwError(() => error401));

    let result = true;
    await new Promise<void>((resolve) => {
      store.restoreSession().subscribe({
        next: (val) => {
          result = val;
          resolve();
        },
      });
    });

    expect(result).toBe(false);
    expect(store.initialized()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(store.accessToken()).toBeNull();
    expect(store.error()).toBeNull();
  });

  it('G - restoreSession success: should restore user/token from HttpOnly cookie and set initialized=true', async () => {
    authServiceSpy.refresh.mockReturnValue(of(mockAuthResponse));

    let result = false;
    await new Promise<void>((resolve) => {
      store.restoreSession().subscribe({
        next: (val) => {
          result = val;
          resolve();
        },
      });
    });

    expect(result).toBe(true);
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBe('mock-access-token-xyz');
    expect(store.user()).toEqual(mockUser);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('H - restoreSession network error: should set initialized=true with error message and return false without throwing', async () => {
    const error0 = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    authServiceSpy.refresh.mockReturnValue(throwError(() => error0));

    let result = true;
    await new Promise<void>((resolve) => {
      store.restoreSession().subscribe({
        next: (val) => {
          result = val;
          resolve();
        },
      });
    });

    expect(result).toBe(false);
    expect(store.initialized()).toBe(true);
    expect(store.error()).toBe('Não foi possível conectar ao servidor.');
  });
});
