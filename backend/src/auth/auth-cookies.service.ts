import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const AUTH_COOKIE_PATH = '/api/v1/auth';

@Injectable()
export class AuthCookiesService {
  private readonly isSecure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly maxAge: number;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const cookieSecureEnv = this.configService.get<string>('COOKIE_SECURE');

    // Em produção ou se explicitamente configurado como 'true'
    this.isSecure = cookieSecureEnv === 'true' || nodeEnv === 'production';

    const sameSiteEnv = (this.configService.get<string>('COOKIE_SAME_SITE') || 'lax').toLowerCase();
    this.sameSite = (['lax', 'strict', 'none'].includes(sameSiteEnv) ? sameSiteEnv : 'lax') as
      | 'lax'
      | 'strict'
      | 'none';

    // SameSite=None exige obrigatoriamente Secure=true (HTTPS) de acordo com os padrões web
    if (this.sameSite === 'none' && !this.isSecure) {
      throw new Error(
        'Configuração de segurança inválida: cookies com SameSite=None exigem obrigatoriamente Secure=true (HTTPS).',
      );
    }

    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    this.maxAge = this.parseDurationToMs(refreshExpiresIn, 7 * 24 * 60 * 60 * 1000);
  }

  getRefreshTokenCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: this.sameSite,
      path: AUTH_COOKIE_PATH,
      maxAge: this.maxAge,
    };
  }

  getClearCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: this.sameSite,
      path: AUTH_COOKIE_PATH,
    };
  }

  setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, this.getRefreshTokenCookieOptions());
  }

  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, this.getClearCookieOptions());
  }

  private parseDurationToMs(duration: string, defaultMs: number): number {
    if (!duration) return defaultMs;
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return defaultMs;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return val * 1000;
      case 'm':
        return val * 60 * 1000;
      case 'h':
        return val * 60 * 60 * 1000;
      case 'd':
        return val * 24 * 60 * 60 * 1000;
      default:
        return defaultMs;
    }
  }
}
