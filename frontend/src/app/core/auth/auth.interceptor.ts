import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse } from './auth.models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const IS_AUTH_RETRY = new HttpContextToken<boolean>(() => false);

let refreshInFlight$: Observable<AuthResponse> | null = null;

/**
 * Resets the in-flight refresh observable.
 * Primarily used for test isolation.
 */
export function resetRefreshInFlight(): void {
  refreshInFlight$ = null;
}

export function isApiUrl(url: string, apiBaseUrl: string): boolean {
  if (url.startsWith(apiBaseUrl)) {
    return true;
  }
  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsedApi = new URL(apiBaseUrl, baseOrigin);
    const parsedReq = new URL(url, baseOrigin);
    return parsedReq.origin === parsedApi.origin && parsedReq.pathname.startsWith(parsedApi.pathname);
  } catch {
    return url.startsWith(apiBaseUrl);
  }
}

export function isAuthPath(url: string, apiBaseUrl: string, path: string): boolean {
  const target = `${apiBaseUrl}${path}`;
  if (url === target || url.startsWith(`${target}?`)) {
    return true;
  }
  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsedTarget = new URL(target, baseOrigin);
    const parsedReq = new URL(url, baseOrigin);
    return parsedReq.origin === parsedTarget.origin && parsedReq.pathname === parsedTarget.pathname;
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiBaseUrl = inject(API_BASE_URL);

  // 1. External URLs are not intercepted for auth
  if (!isApiUrl(req.url, apiBaseUrl)) {
    return next(req);
  }

  const isLogin = isAuthPath(req.url, apiBaseUrl, '/auth/login');
  const isRefresh = isAuthPath(req.url, apiBaseUrl, '/auth/refresh');
  const isLogout = isAuthPath(req.url, apiBaseUrl, '/auth/logout');

  let modifiedReq = req;

  // 2. Cookie routes must guarantee withCredentials: true
  if (isLogin || isRefresh || isLogout) {
    if (!modifiedReq.withCredentials) {
      modifiedReq = modifiedReq.clone({ withCredentials: true });
    }
  }

  // 3. Attach Bearer token for protected requests (do NOT attach for login or refresh)
  const token = authStore.accessToken();
  if (token && !isLogin && !isRefresh && !req.context.get(SKIP_AUTH)) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // 4. Handle response and 401 retry
  return next(modifiedReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      // Do NOT attempt refresh for login or refresh 401 errors
      if (isLogin || isRefresh) {
        return throwError(() => err);
      }

      // If this request was already retried with a fresh token, stop to avoid infinite loop
      if (req.context.get(IS_AUTH_RETRY)) {
        authStore.clearSession();
        router.navigate(['/login']);
        return throwError(() => err);
      }

      // Single-flight refresh coordination
      if (!refreshInFlight$) {
        refreshInFlight$ = authService.refresh().pipe(
          shareReplay(1),
          finalize(() => {
            refreshInFlight$ = null;
          }),
        );
      }

      return refreshInFlight$.pipe(
        switchMap((res) => {
          authStore.setSession(res.accessToken, res.user);

          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${res.accessToken}`,
            },
            context: req.context.set(IS_AUTH_RETRY, true),
          });

          return next(retryReq);
        }),
        catchError((refreshErr) => {
          authStore.clearSession();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
