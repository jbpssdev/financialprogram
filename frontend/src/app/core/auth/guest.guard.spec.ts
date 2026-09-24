import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStore } from './auth.store';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  let authStore: AuthStore;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn((commands) => ({
              commands,
              toString: () => '/dashboard',
            })),
          },
        },
      ],
    });

    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  it('R - guestGuard authenticated: should redirect to /dashboard UrlTree', () => {
    authStore.setSession('valid-token', {
      id: '2',
      name: 'Logged In User',
      email: 'user@empresa.com',
      isActive: true,
    });

    const result = TestBed.runInInjectionContext(() => guestGuard(mockRoute, mockState));
    expect(result).toBeInstanceOf(Object);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('S - guestGuard unauthenticated: should allow activation (return true)', () => {
    authStore.clearSession();

    const result = TestBed.runInInjectionContext(() => guestGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });
});
