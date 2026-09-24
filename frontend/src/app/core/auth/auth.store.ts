import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { AuthResponse, AuthUser, LoginRequest } from './auth.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _initialized = signal<boolean>(false);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isAuthenticated = computed(() => !!this._user() && !!this._accessToken());

  setSession(accessToken: string, user: AuthUser): void {
    this._accessToken.set(accessToken);
    this._user.set(user);
    this._error.set(null);
    this._initialized.set(true);
  }

  clearSession(errorMessage: string | null = null): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._error.set(errorMessage);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._loading.set(true);
    this._error.set(null);

    return this.authService.login(credentials).pipe(
      tap((res) => {
        this.setSession(res.accessToken, res.user);
      }),
      catchError((err: unknown) => {
        const message = this.normalizeError(err);
        this.clearSession(message);
        return throwError(() => err);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  logout(): Observable<void> {
    this._loading.set(true);
    return this.authService.logout().pipe(
      catchError(() => of(undefined as void)),
      finalize(() => {
        this.clearSession();
        this._loading.set(false);
        this.router.navigate(['/login']);
      }),
    );
  }

  restoreSession(): Observable<boolean> {
    this._loading.set(true);
    return this.authService.refresh().pipe(
      map((res) => {
        this.setSession(res.accessToken, res.user);
        this._loading.set(false);
        return true;
      }),
      catchError((err: unknown) => {
        this._loading.set(false);
        this._initialized.set(true);

        if (err instanceof HttpErrorResponse && err.status === 401) {
          // Normal case: no active refresh session
          this._user.set(null);
          this._accessToken.set(null);
          this._error.set(null);
          return of(false);
        }

        // Network or server offline
        this._error.set('Não foi possível conectar ao servidor.');
        return of(false);
      }),
    );
  }

  private normalizeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Credenciais inválidas.';
      }
      if (error.status === 0) {
        return 'Não foi possível conectar ao servidor.';
      }
    }
    return 'Não foi possível concluir a operação.';
  }
}
