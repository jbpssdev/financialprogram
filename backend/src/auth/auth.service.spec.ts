import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

const hashRefreshTokenForTest = (t: string) =>
  bcrypt.hash(crypto.createHash('sha256').update(t).digest('hex'), 10);

describe('AuthService & Auth Security', () => {
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Admin User',
    email: 'admin@empresa.com',
    passwordHash: '',
    refreshTokenHash: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('secret123', 10);
    mockUser.refreshTokenHash = await hashRefreshTokenForTest('valid-refresh-token');
  });

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let tokenCounter = 0;
  const mockJwtService = {
    sign: jest.fn().mockImplementation((payload) => `signed-token-${payload.sub}-${payload.jti || ++tokenCounter}`),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'JWT_ACCESS_SECRET':
          return 'test-access-secret';
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret';
        case 'JWT_ACCESS_EXPIRES_IN':
          return '15m';
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        default:
          return undefined;
      }
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('login', () => {
    it('deve autenticar com sucesso com credenciais válidas e retornar tokens e usuário sem hashes', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: ' ADMIN@EMPRESA.COM ',
        password: 'secret123',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@empresa.com' },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenHash: expect.any(String) },
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });
      expect((result.user as any).passwordHash).toBeUndefined();
      expect((result.user as any).refreshTokenHash).toBeUndefined();
    });

    it('deve rejeitar email inexistente com mensagem genérica 401', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'inexistente@empresa.com',
          password: 'qualquer-senha',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas.'));
    });

    it('deve rejeitar senha incorreta com mensagem genérica 401', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'admin@empresa.com',
          password: 'senha-errada',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas.'));
    });

    it('deve rejeitar usuário inativo mesmo com senha correta', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'admin@empresa.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas.'));
    });
  });

  describe('refresh', () => {
    it('deve realizar rotação de tokens com sucesso para refresh token válido', async () => {
      const rawRefreshToken = 'valid-refresh-token';
      const storedHash = await hashRefreshTokenForTest(rawRefreshToken);

      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: storedHash,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await authService.refresh(rawRefreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(rawRefreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenHash: expect.any(String) },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });
    });

    it('deve rejeitar quando refresh token for expirado ou inválido na assinatura JWT', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(authService.refresh('token-expirado')).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido ou expirado.'),
      );
    });

    it('deve invalidar token no banco e rejeitar se o hash não coincidir (tentativa de reuso)', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: await hashRefreshTokenForTest('token-diferente'),
      });

      await expect(authService.refresh('token-antigo')).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido.'),
      );

      // Deve ter limpado o refreshTokenHash por segurança
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenHash: null },
      });
    });

    it('deve rejeitar se o usuário no banco não possuir refreshTokenHash (já deslogado)', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });

      await expect(authService.refresh('valid-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido.'),
      );
    });

    it('deve rejeitar se usuário estiver inativo no momento do refresh', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(authService.refresh('valid-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido.'),
      );
    });
  });

  describe('logout', () => {
    it('deve invalidar o refresh token hash no banco de dados', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await authService.logout(mockUser.id);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenHash: null },
      });
      expect(result).toEqual({ message: 'Logout realizado com sucesso.' });
    });
  });

  describe('getProfile', () => {
    it('deve retornar dados sanitizados do usuário ativo', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });

      const profile = await authService.getProfile(mockUser.id);

      expect(profile).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).refreshTokenHash).toBeUndefined();
    });

    it('deve lançar 401 se usuário não for encontrado', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('id-inexistente')).rejects.toThrow(
        new UnauthorizedException('Usuário não encontrado ou inativo.'),
      );
    });

    it('deve lançar 401 se usuário for inativo', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: false,
      });

      await expect(authService.getProfile(mockUser.id)).rejects.toThrow(
        new UnauthorizedException('Usuário não encontrado ou inativo.'),
      );
    });
  });

  describe('JwtStrategy', () => {
    it('deve validar payload e retornar usuário ativo', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });

      const user = await jwtStrategy.validate({ sub: mockUser.id, email: mockUser.email });
      expect(user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });
    });

    it('deve rejeitar se usuário não existir mais no banco', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        jwtStrategy.validate({ sub: 'user-deletado', email: 'deletado@empresa.com' }),
      ).rejects.toThrow(new UnauthorizedException('Acesso não autorizado. Usuário inexistente.'));
    });

    it('deve rejeitar se usuário estiver inativo', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: false,
      });

      await expect(
        jwtStrategy.validate({ sub: mockUser.id, email: mockUser.email }),
      ).rejects.toThrow(new UnauthorizedException('Acesso não autorizado. Usuário inativo.'));
    });
  });

  describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new JwtAuthGuard(reflector);
    });

    it('deve permitir acesso direto se a rota for marcada com @Public()', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('deve lançar UnauthorizedException se user não estiver presente em handleRequest', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(
        new UnauthorizedException('Acesso não autorizado. Token ausente, inválido ou expirado.'),
      );
    });

    it('deve retornar user se autenticado com sucesso em handleRequest', () => {
      const user = { id: 'u1', email: 'admin@empresa.com' };
      expect(guard.handleRequest(null, user)).toBe(user);
    });
  });

  describe('Validação de Secrets e Configuração Crítica', () => {
    it('deve lançar erro se JWT_ACCESS_SECRET estiver ausente', () => {
      const invalidConfig = {
        get: jest.fn().mockImplementation((k: string) => (k === 'JWT_REFRESH_SECRET' ? 'ref-secret' : undefined)),
      } as any;

      expect(() => new AuthService(mockPrismaService as any, mockJwtService as any, invalidConfig)).toThrow(
        'Configuração crítica ausente: JWT_ACCESS_SECRET é obrigatório.',
      );
    });

    it('deve lançar erro se JWT_REFRESH_SECRET estiver ausente', () => {
      const invalidConfig = {
        get: jest.fn().mockImplementation((k: string) => (k === 'JWT_ACCESS_SECRET' ? 'acc-secret' : undefined)),
      } as any;

      expect(() => new AuthService(mockPrismaService as any, mockJwtService as any, invalidConfig)).toThrow(
        'Configuração crítica ausente: JWT_REFRESH_SECRET é obrigatório.',
      );
    });

    it('deve lançar erro se JWT_ACCESS_SECRET e JWT_REFRESH_SECRET forem idênticos', () => {
      const identicalConfig = {
        get: jest.fn().mockReturnValue('mesmo-secret-inseguro'),
      } as any;

      expect(() => new AuthService(mockPrismaService as any, mockJwtService as any, identicalConfig)).toThrow(
        'Violação de segurança: JWT_ACCESS_SECRET e JWT_REFRESH_SECRET não podem ser iguais.',
      );
    });

    it('JwtStrategy deve lançar erro se JWT_ACCESS_SECRET estiver ausente', () => {
      const invalidConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;

      expect(() => new JwtStrategy(invalidConfig, mockPrismaService as any)).toThrow(
        'Configuração crítica ausente: JWT_ACCESS_SECRET é obrigatório.',
      );
    });
  });

  describe('Sessões Simultâneas e Ciclo de Vida do Token', () => {
    it('segundo login deve sobrescrever refreshTokenHash, invalidando o refresh token do primeiro login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      let persistedHash: string | null = null;
      mockPrismaService.user.update.mockImplementation(({ data }) => {
        persistedHash = data.refreshTokenHash;
        return Promise.resolve({ ...mockUser, refreshTokenHash: persistedHash });
      });

      // Primeiro login
      const session1 = await authService.login({ email: mockUser.email, password: 'secret123' });
      const session1Refresh = session1.refreshToken;
      const hashAfterSession1 = persistedHash;

      // Segundo login (ex: em outro dispositivo)
      const session2 = await authService.login({ email: mockUser.email, password: 'secret123' });
      const session2Refresh = session2.refreshToken;
      const hashAfterSession2 = persistedHash;

      expect(hashAfterSession1).not.toBe(hashAfterSession2);

      // Simulação do refresh da primeira sessão: o banco agora contém o hash da segunda sessão
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: hashAfterSession2,
      });

      await expect(authService.refresh(session1Refresh)).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido.'),
      );

      // O refresh da segunda sessão deve continuar funcionando
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: hashAfterSession2,
      });
      const refreshSession2 = await authService.refresh(session2Refresh);
      expect(refreshSession2).toHaveProperty('accessToken');
    });

    it('usuário desativado após login perde acesso imediatamente com o access token emitido anteriormente', async () => {
      // 1. Usuário estava ativo no momento da emissão do token
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });
      const validUser = await jwtStrategy.validate({ sub: mockUser.id, email: mockUser.email });
      expect(validUser.isActive).toBe(true);

      // 2. User.isActive passa para false no banco
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: false,
      });

      // 3. Ao apresentar o MESMO access token ainda não expirado, JwtStrategy bloqueia com 401
      await expect(jwtStrategy.validate({ sub: mockUser.id, email: mockUser.email })).rejects.toThrow(
        new UnauthorizedException('Acesso não autorizado. Usuário inativo.'),
      );
    });

    it('logout invalida refresh token no banco mas access token permanece válido de forma stateless até expirar', async () => {
      // 1. Logout limpa refreshTokenHash
      await authService.logout(mockUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenHash: null },
      });

      // 2. Refresh é rejeitado imediatamente após logout
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });
      await expect(authService.refresh('token-apos-logout')).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido.'),
      );

      // 3. Access token técnico é validado de forma stateless (enquanto usuário for ativo no banco)
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        isActive: true,
      });
      const validated = await jwtStrategy.validate({ sub: mockUser.id, email: mockUser.email });
      expect(validated.id).toBe(mockUser.id);
    });
  });
});
