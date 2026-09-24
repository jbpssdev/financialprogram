import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OriginCsrfGuard } from './origin-csrf.guard';

describe('OriginCsrfGuard', () => {
  let guard: OriginCsrfGuard;
  let mockConfigService: { get: jest.Mock };

  const createMockContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    const mockRequest = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'FRONTEND_URL') {
          return 'http://localhost:4200, https://app.empresa.com';
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OriginCsrfGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<OriginCsrfGuard>(OriginCsrfGuard);
  });

  it('deve permitir requisições sem cabeçalho Origin (CLI, smoke test, curl, server-to-server)', () => {
    const context = createMockContext({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('L. deve permitir requisições de origem autorizada localhost:4200', () => {
    const context = createMockContext({ origin: 'http://localhost:4200' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve permitir origens autorizadas com barra final', () => {
    const context = createMockContext({ origin: 'http://localhost:4200/' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve permitir origens secundárias configuradas', () => {
    const context = createMockContext({ origin: 'https://app.empresa.com' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('M. & N. deve rejeitar origens não autorizadas com ForbiddenException (403)', () => {
    const context = createMockContext({ origin: 'http://evil.com' });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException("Acesso negado: origem 'http://evil.com' não autorizada por política de segurança."),
    );
  });

  it('M. deve rejeitar subdomínios não autorizados ou protocolos incorretos', () => {
    const context = createMockContext({ origin: 'http://app.empresa.com' }); // http ao invés de https

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
