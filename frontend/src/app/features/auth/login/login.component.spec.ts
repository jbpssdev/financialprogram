import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let queryParamsMap: Map<string, string>;

  // Reactive store mock with real signals
  let mockAuthStore: {
    user: ReturnType<typeof signal>;
    accessToken: ReturnType<typeof signal>;
    loading: ReturnType<typeof signal>;
    error: ReturnType<typeof signal>;
    isAuthenticated: ReturnType<typeof signal>;
    login: ReturnType<typeof vi.fn>;
    setError: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    queryParamsMap = new Map<string, string>();

    mockAuthStore = {
      user: signal(null),
      accessToken: signal(null),
      loading: signal(false),
      error: signal(null),
      isAuthenticated: signal(false),
      login: vi.fn(),
      setError: vi.fn((err: string | null) => mockAuthStore.error.set(err)),
      clearSession: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParamsMap.get(key) ?? null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('A - should render email and password fields, branding, and submit button', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input#email')).toBeTruthy();
    expect(el.querySelector('input#password')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain('FinancialProgram');
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('B - email obrigatório: should show error message when email is empty on submit', () => {
    component['form'].controls.email.setValue('');
    component['form'].controls.password.setValue('password123');

    component['onSubmit']();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const errorEl = el.querySelector('#email-error');
    expect(errorEl?.textContent).toContain('Email obrigatório.');
  });

  it('C - email inválido: should show error message when email has invalid format', () => {
    component['form'].controls.email.setValue('invalid-email-format');
    component['form'].controls.password.setValue('password123');

    component['onSubmit']();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const errorEl = el.querySelector('#email-error');
    expect(errorEl?.textContent).toContain('Informe um e-mail válido.');
  });

  it('D - password obrigatória: should show error message when password is empty on submit', () => {
    component['form'].controls.email.setValue('admin@empresa.com');
    component['form'].controls.password.setValue('');

    component['onSubmit']();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const errorEl = el.querySelector('#password-error');
    expect(errorEl?.textContent).toContain('Senha obrigatória.');
  });

  it('E - form inválido não chama login: should not invoke AuthStore.login when form is invalid', () => {
    component['form'].controls.email.setValue('');
    component['form'].controls.password.setValue('');

    component['onSubmit']();

    expect(mockAuthStore.login).not.toHaveBeenCalled();
    expect(component['submitted']()).toBe(true);
  });

  it('F - form válido chama AuthStore.login: should call store.login with exact credentials', () => {
    mockAuthStore.login.mockReturnValue(of({ accessToken: 'jwt', user: {} }));
    component['form'].controls.email.setValue('admin@empresa.com');
    component['form'].controls.password.setValue('SecurePass@123');

    component['onSubmit']();

    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'admin@empresa.com',
      password: 'SecurePass@123',
    });
  });

  it('G - loading desabilita botão: should disable submit button and show spinner when loading', () => {
    mockAuthStore.loading.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Entrando...');
  });

  it('H - erro do store aparece na tela: should display alert banner when authStore.error is present', () => {
    mockAuthStore.error.set('Credenciais inválidas.');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const alertEl = el.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy();
    expect(alertEl?.textContent).toContain('Credenciais inválidas.');
  });

  it('I - login válido sem returnUrl: should navigate to /dashboard', () => {
    mockAuthStore.login.mockReturnValue(of({ accessToken: 'jwt', user: {} }));
    component['form'].controls.email.setValue('admin@empresa.com');
    component['form'].controls.password.setValue('password');

    component['onSubmit']();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('J - login válido com returnUrl interno: should navigate to returnUrl', () => {
    queryParamsMap.set('returnUrl', '/sales/invoices');
    mockAuthStore.login.mockReturnValue(of({ accessToken: 'jwt', user: {} }));
    component['form'].controls.email.setValue('admin@empresa.com');
    component['form'].controls.password.setValue('password');

    component['onSubmit']();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/sales/invoices');
  });

  it('K - returnUrl externo/malicioso: should fallback to /dashboard to prevent open redirect', () => {
    component['form'].controls.email.setValue('admin@empresa.com');
    component['form'].controls.password.setValue('password');

    const maliciousUrls = [
      'https://evil.com',
      '//evil.com/phishing',
      'javascript:alert(1)',
      'http://attacker.com',
    ];

    maliciousUrls.forEach((maliciousUrl) => {
      queryParamsMap.set('returnUrl', maliciousUrl);
      router.navigateByUrl.mockClear();
      mockAuthStore.login.mockReturnValue(of({ accessToken: 'jwt', user: {} }));

      component['onSubmit']();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('L - form submission works via form element trigger', () => {
    mockAuthStore.login.mockReturnValue(of({ accessToken: 'jwt', user: {} }));
    component['form'].controls.email.setValue('admin@empresa.com');
    component['form'].controls.password.setValue('password');

    const formEl = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit'));

    expect(mockAuthStore.login).toHaveBeenCalled();
  });

  it('M - toggle senha: should switch input type between password and text and update aria-label', () => {
    const input = fixture.nativeElement.querySelector('input#password') as HTMLInputElement;
    const toggleBtn = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;

    expect(input.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Exibir senha');
    expect(toggleBtn.getAttribute('tabindex')).not.toBe('-1');

    toggleBtn.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Ocultar senha');

    toggleBtn.click();
    fixture.detectChanges();

    expect(input.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Exibir senha');
  });

  it('N - user editing field clears store error', () => {
    mockAuthStore.error.set('Credenciais inválidas.');
    fixture.detectChanges();

    // User types in email field
    component['form'].controls.email.setValue('new@empresa.com');
    fixture.detectChanges();

    expect(mockAuthStore.setError).toHaveBeenCalledWith(null);
  });
});
