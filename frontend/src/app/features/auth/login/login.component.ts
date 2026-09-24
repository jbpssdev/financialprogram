import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideEye,
  lucideEyeOff,
  lucideLoader2,
  lucideLock,
  lucideMail,
} from '@ng-icons/lucide';

import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { AuthStore } from '../../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmCardImports,
    HlmInput,
    HlmLabel,
    HlmButton,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideAlertCircle,
      lucideEye,
      lucideEyeOff,
      lucideLoader2,
      lucideLock,
      lucideMail,
    }),
  ],
  template: `
    <div class="min-h-screen w-full flex flex-col justify-center items-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div class="w-full max-w-md space-y-6">
        <!-- Wordmark / Branding -->
        <header class="text-center space-y-1.5">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            FinancialProgram
          </h1>
          <p class="text-sm text-muted-foreground">
            Acesse sua conta para gerenciar o exercício contábil
          </p>
        </header>

        <!-- Authentication Card -->
        <div hlmCard class="shadow-sm border border-border bg-card">
          <div hlmCardHeader class="pb-4">
            <h2 hlmCardTitle class="text-lg font-semibold tracking-tight text-foreground">
              Entrar no Sistema
            </h2>
            <p hlmCardDescription class="text-xs text-muted-foreground">
              Digite seu e-mail corporativo e senha cadastrada.
            </p>
          </div>

          <div hlmCardContent>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
              <!-- Inline Backend Error Message -->
              @if (authStore.error(); as errorMessage) {
                <div
                  role="alert"
                  aria-live="assertive"
                  class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive flex items-center gap-2"
                >
                  <ng-icon name="lucideAlertCircle" class="size-4 shrink-0" />
                  <span>{{ errorMessage }}</span>
                </div>
              }

              <!-- E-mail Field -->
              <div class="space-y-1.5">
                <label hlmLabel for="email" class="text-xs sm:text-sm font-medium">
                  E-mail corporativo
                </label>
                <div class="relative">
                  <input
                    hlmInput
                    id="email"
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    placeholder="admin@empresa.com"
                    [attr.aria-invalid]="isFieldInvalid('email')"
                    [attr.aria-describedby]="isFieldInvalid('email') ? 'email-error' : null"
                    class="w-full"
                  />
                </div>
                @if (isFieldInvalid('email')) {
                  <p id="email-error" class="text-xs text-destructive mt-1 font-medium">
                    @if (form.controls.email.errors?.['required']) {
                      Email obrigatório.
                    } @else if (form.controls.email.errors?.['email']) {
                      Informe um e-mail válido.
                    }
                  </p>
                }
              </div>

              <!-- Password Field -->
              <div class="space-y-1.5">
                <label hlmLabel for="password" class="text-xs sm:text-sm font-medium">
                  Senha
                </label>
                <div class="relative flex items-center">
                  <input
                    hlmInput
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    [attr.aria-invalid]="isFieldInvalid('password')"
                    [attr.aria-describedby]="isFieldInvalid('password') ? 'password-error' : null"
                    class="w-full pr-10"
                  />
                  <button
                    type="button"
                    hlmBtn
                    variant="ghost"
                    size="icon-sm"
                    (click)="toggleShowPassword()"
                    [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Exibir senha'"
                    class="absolute right-1 text-muted-foreground hover:text-foreground"
                  >
                    @if (showPassword()) {
                      <ng-icon name="lucideEyeOff" class="size-4" />
                    } @else {
                      <ng-icon name="lucideEye" class="size-4" />
                    }
                  </button>
                </div>
                @if (isFieldInvalid('password')) {
                  <p id="password-error" class="text-xs text-destructive mt-1 font-medium">
                    Senha obrigatória.
                  </p>
                }
              </div>

              <!-- Submit Button -->
              <button
                hlmBtn
                type="submit"
                [disabled]="authStore.loading()"
                class="w-full mt-2 font-medium"
              >
                @if (authStore.loading()) {
                  <ng-icon name="lucideLoader2" class="mr-2 size-4 animate-spin" />
                  <span>Entrando...</span>
                } @else {
                  <span>Entrar</span>
                }
              </button>
            </form>
          </div>

          <div hlmCardFooter class="pt-0 pb-4 text-center">
            <p class="text-xs text-muted-foreground w-full">
              Sessão protegida por autenticação em dois fatores e cookies seguros.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showPassword = signal<boolean>(false);
  protected readonly submitted = signal<boolean>(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // Clear global error message when user starts modifying form inputs
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.authStore.error()) {
          this.authStore.setError(null);
        }
      });
  }

  protected isFieldInvalid(fieldName: 'email' | 'password'): boolean {
    const control = this.form.get(fieldName);
    if (!control) return false;
    return control.invalid && (control.touched || this.submitted());
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  protected onSubmit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.authStore.login({ email, password }).subscribe({
      next: () => {
        const returnUrl = this.getSafeReturnUrl();
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        // Error handling and message normalization handled by AuthStore
      },
    });
  }

  private getSafeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!returnUrl) {
      return '/dashboard';
    }

    // Open redirect protection: accept only root-relative paths without scheme or protocol-relative slashes
    if (
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//') &&
      !returnUrl.includes(':') &&
      !returnUrl.includes('\\')
    ) {
      return returnUrl;
    }

    return '/dashboard';
  }
}
