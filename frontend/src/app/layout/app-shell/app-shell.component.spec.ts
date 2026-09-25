import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore, AuthUser } from '../../core/auth';
import { APP_NAVIGATION } from './app-navigation';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;

  let mockAuthStore: {
    user: ReturnType<typeof signal<AuthUser | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    if (typeof window !== 'undefined' && !window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }

    mockAuthStore = {

      user: signal<AuthUser | null>({
        id: 'usr-1',
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com',
        isActive: true,
      }),
      loading: signal<boolean>(false),
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the brand header and router outlet', () => {
    expect(fixture.nativeElement.textContent).toContain('FinancialProgram');
    const routerOutlet = fixture.debugElement.query(By.directive(RouterOutlet));
    expect(routerOutlet).toBeTruthy();
  });

  it('should display the desktop sidebar with all primary navigation links', () => {
    const desktopNav = fixture.nativeElement.querySelector('aside nav');
    expect(desktopNav).toBeTruthy();

    expect(fixture.nativeElement.querySelector('[data-testid="nav-dashboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-sales"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-purchases"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-inventory"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-products"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-suppliers"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-finance"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-loans"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-monthly-closing"]')).toBeTruthy();
  });

  it('should display finance submenu children when expanded', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="nav-finance-incomes"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-finance-expenses"]')).toBeTruthy();
  });

  it('should toggle finance submenu visibility when clicking the parent button', () => {
    const financeBtn = fixture.nativeElement.querySelector('[data-testid="nav-finance"]');
    expect(financeBtn).toBeTruthy();

    financeBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-finance-incomes"]')).toBeNull();

    financeBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="nav-finance-incomes"]')).toBeTruthy();
  });

  it('should display authenticated user name, email and derived initials', () => {
    const nameEl = fixture.nativeElement.querySelector('[data-testid="user-name-desktop"]');
    const emailEl = fixture.nativeElement.querySelector('[data-testid="user-email-desktop"]');
    const avatarEl = fixture.nativeElement.querySelector('[data-testid="user-avatar-desktop"]');

    expect(nameEl.textContent.trim()).toBe('Carlos Oliveira');
    expect(emailEl.textContent.trim()).toBe('carlos@empresa.com');
    expect(avatarEl.textContent.trim()).toBe('CO');
  });

  it('should trigger authStore.logout when logout button is clicked', () => {
    const logoutBtn = fixture.nativeElement.querySelector('[data-testid="logout-button-desktop"]');
    expect(logoutBtn).toBeTruthy();

    logoutBtn.click();
    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
  });

  it('should disable logout button when authStore is loading', () => {
    mockAuthStore.loading.set(true);
    fixture.detectChanges();

    const logoutBtn = fixture.nativeElement.querySelector('[data-testid="logout-button-desktop"]');
    expect(logoutBtn.disabled).toBe(true);
  });

  it('should render the mobile menu trigger button', () => {
    const mobileTrigger = fixture.nativeElement.querySelector('[data-testid="mobile-menu-trigger"]');
    expect(mobileTrigger).toBeTruthy();
    expect(mobileTrigger.getAttribute('aria-label')).toBe('Abrir menu de navegação');
  });

  describe('APP_NAVIGATION integrity', () => {
    it('should have unique IDs and unique non-empty paths across all items and children', () => {
      const ids = new Set<string>();
      const paths = new Set<string>();

      for (const item of APP_NAVIGATION) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);

        if (item.path) {
          expect(paths.has(item.path)).toBe(false);
          paths.add(item.path);
        }

        if (item.children) {
          for (const child of item.children) {
            expect(ids.has(child.id)).toBe(false);
            ids.add(child.id);
            expect(paths.has(child.path)).toBe(false);
            paths.add(child.path);
          }
        }
      }

      expect(paths.size).toBe(10); // 10 distinct page routes
    });
  });
});
