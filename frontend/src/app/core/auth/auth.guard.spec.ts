import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('authGuard', () => {
  let authStore: AuthStore;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard/reports' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn((commands, extras) => ({
              commands,
              extras,
              toString: () => `/login?returnUrl=${extras?.queryParams?.returnUrl}`,
            })),
          },
        },
      ],
    });

    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  it('P - authGuard authenticated: should allow activation (return true)', () => {
    authStore.setSession('valid-token', {
      id: '1',
      name: 'Manager',
      email: 'mgr@empresa.com',
      isActive: true,
    });

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('Q - authGuard unauthenticated: should return UrlTree to /login with returnUrl query parameter', () => {
    authStore.clearSession();

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBeInstanceOf(Object);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard/reports' },
    });
  });
});
