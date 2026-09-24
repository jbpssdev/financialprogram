import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore, AuthUser } from '../../core/auth';
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
    mockAuthStore = {
      user: signal<AuthUser | null>(null),
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
    const brand = fixture.nativeElement.textContent;
    expect(brand).toContain('FinancialProgram');

    const routerOutlet = fixture.debugElement.query(By.directive(RouterOutlet));
    expect(routerOutlet).toBeTruthy();
  });

  it('should display the authenticated user name when present', () => {
    mockAuthStore.user.set({
      id: 'user-1',
      name: 'João Contador',
      email: 'joao@empresa.com',
      isActive: true,
    });
    fixture.detectChanges();

    const userNameEl = fixture.nativeElement.querySelector('[data-testid="user-name"]');
    expect(userNameEl).toBeTruthy();
    expect(userNameEl.textContent.trim()).toBe('João Contador');
  });

  it('should not display user name element when no user is logged in', () => {
    mockAuthStore.user.set(null);
    fixture.detectChanges();

    const userNameEl = fixture.nativeElement.querySelector('[data-testid="user-name"]');
    expect(userNameEl).toBeNull();
  });

  it('should call authStore.logout when logout button is clicked', () => {
    const logoutBtn = fixture.nativeElement.querySelector('[data-testid="logout-button"]');
    expect(logoutBtn).toBeTruthy();

    logoutBtn.click();
    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
  });

  it('should disable logout button when authStore is loading', () => {
    mockAuthStore.loading.set(true);
    fixture.detectChanges();

    const logoutBtn = fixture.nativeElement.querySelector('[data-testid="logout-button"]');
    expect(logoutBtn.disabled).toBe(true);
  });
});
