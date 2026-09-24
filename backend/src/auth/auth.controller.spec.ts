import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthCookiesService } from './auth-cookies.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OriginCsrfGuard } from './guards/origin-csrf.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
  };
  let mockAuthCookiesService: {
    setRefreshTokenCookie: jest.Mock;
    clearRefreshTokenCookie: jest.Mock;
  };

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Admin User',
    email: 'admin@empresa.com',
    isActive: true,
  };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    mockAuthCookiesService = {
      setRefreshTokenCookie: jest.fn(),
      clearRefreshTokenCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthCookiesService, useValue: mockAuthCookiesService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:4200'),
          },
        },
      ],
    })
      .overrideGuard(OriginCsrfGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('A. & K. deve autenticar, gravar refresh token em cookie HttpOnly e retornar JSON APENAS com accessToken e user', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-secret-xyz',
        user: mockUser,
      });

      const mockRes = {} as Response;
      const result = await controller.login(
        { email: 'admin@empresa.com', password: 'password123' },
        mockRes,
      );

      // Set-Cookie deve ser chamado com o refresh token
      expect(mockAuthCookiesService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockRes,
        'refresh-token-secret-xyz',
      );

      // JSON retornado NÃO pode conter refreshToken
      expect(result).toHaveProperty('accessToken', 'access-token-123');
      expect(result).toHaveProperty('user', mockUser);
      expect((result as any).refreshToken).toBeUndefined();
      expect((result as any).passwordHash).toBeUndefined();
      expect((result as any).refreshTokenHash).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('D. deve rejeitar com 401 quando o cookie refresh_token não estiver presente', async () => {
      const mockReq = { cookies: {} } as any;
      const mockRes = {} as Response;

      await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(
        new UnauthorizedException('Refresh token não encontrado.'),
      );

      expect(mockAuthService.refresh).not.toHaveBeenCalled();
      expect(mockAuthCookiesService.setRefreshTokenCookie).not.toHaveBeenCalled();
    });

    it('E. & K. deve ler cookie, rotacionar, gravar novo cookie e retornar APENAS novo accessToken e user', async () => {
      const mockReq = {
        cookies: {
          refresh_token: 'existing-cookie-refresh-token',
        },
      } as any;
      const mockRes = {} as Response;

      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access-token-456',
        refreshToken: 'new-rotated-refresh-token-789',
        user: mockUser,
      });

      const result = await controller.refresh(mockReq, mockRes);

      expect(mockAuthService.refresh).toHaveBeenCalledWith('existing-cookie-refresh-token');
      expect(mockAuthCookiesService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockRes,
        'new-rotated-refresh-token-789',
      );
      expect(result).toHaveProperty('accessToken', 'new-access-token-456');
      expect(result).toHaveProperty('user', mockUser);
      expect((result as any).refreshToken).toBeUndefined();
      expect((result as any).refreshTokenHash).toBeUndefined();
    });
  });

  describe('logout', () => {
    it('G. deve invalidar refresh token no banco e limpar explicitamente o cookie', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logout realizado com sucesso.' });
      const mockRes = {} as Response;

      const result = await controller.logout('user-uuid-1', mockRes);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-uuid-1');
      expect(mockAuthCookiesService.clearRefreshTokenCookie).toHaveBeenCalledWith(mockRes);
      expect(result).toEqual({ message: 'Logout realizado com sucesso.' });
    });
  });

  describe('me', () => {
    it('deve retornar dados do perfil autenticado sem hashes', async () => {
      mockAuthService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile('user-uuid-1');

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(mockUser);
    });
  });
});
