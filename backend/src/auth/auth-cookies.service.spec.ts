import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AUTH_COOKIE_PATH,
  AuthCookiesService,
  REFRESH_COOKIE_NAME,
} from './auth-cookies.service';

describe('AuthCookiesService', () => {
  let service: AuthCookiesService;
  let mockConfigService: { get: jest.Mock };

  const setupService = async (envValues: Record<string, string | undefined>) => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => envValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthCookiesService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module.get<AuthCookiesService>(AuthCookiesService);
  };

  describe('desenvolvimento local (HTTP)', () => {
    beforeEach(async () => {
      service = await setupService({
        NODE_ENV: 'development',
        COOKIE_SECURE: 'false',
        COOKIE_SAME_SITE: 'lax',
        JWT_REFRESH_EXPIRES_IN: '7d',
      });
    });

    it('B. deve configurar cookie com httpOnly: true e path restrito', () => {
      const options = service.getRefreshTokenCookieOptions();

      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe(AUTH_COOKIE_PATH);
      expect(options.sameSite).toBe('lax');
      expect(options.secure).toBe(false);
      expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('deve chamar res.cookie com parâmetros corretos ao definir refresh cookie', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as any;

      service.setRefreshTokenCookie(mockRes, 'dummy-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'dummy-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/api/v1/auth',
          maxAge: 604800000,
        }),
      );
    });

    it('G. deve chamar res.clearCookie com opções idênticas de path e segurança', () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as any;

      service.clearRefreshTokenCookie(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );
    });
  });

  describe('C. ambiente de produção (HTTPS)', () => {
    it('deve forçar secure: true quando NODE_ENV for production', async () => {
      const prodService = await setupService({
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      });

      const options = prodService.getRefreshTokenCookieOptions();
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
    });

    it('deve forçar secure: true quando COOKIE_SECURE for "true"', async () => {
      const secureService = await setupService({
        NODE_ENV: 'development',
        COOKIE_SECURE: 'true',
      });

      const options = secureService.getRefreshTokenCookieOptions();
      expect(options.secure).toBe(true);
    });
  });

  describe('SameSite configuration', () => {
    it('deve aceitar strict quando configurado em desenvolvimento', async () => {
      const strictService = await setupService({
        COOKIE_SAME_SITE: 'strict',
      });
      expect(strictService.getRefreshTokenCookieOptions().sameSite).toBe('strict');
    });

    it('deve aceitar none quando configurado com Secure=true (HTTPS)', async () => {
      const noneService = await setupService({
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'true',
      });
      expect(noneService.getRefreshTokenCookieOptions().sameSite).toBe('none');
      expect(noneService.getRefreshTokenCookieOptions().secure).toBe(true);
    });

    it('E. deve lançar erro e falhar na inicialização se SameSite=None for usado com Secure=false', async () => {
      await expect(
        setupService({
          COOKIE_SAME_SITE: 'none',
          COOKIE_SECURE: 'false',
          NODE_ENV: 'development',
        }),
      ).rejects.toThrow(
        'Configuração de segurança inválida: cookies com SameSite=None exigem obrigatoriamente Secure=true (HTTPS).',
      );
    });

    it('deve adotar lax como fallback para valores inválidos', async () => {
      const fallbackService = await setupService({
        COOKIE_SAME_SITE: 'invalid_value',
      });
      expect(fallbackService.getRefreshTokenCookieOptions().sameSite).toBe('lax');
    });
  });
});
