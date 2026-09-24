import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class OriginCsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(private readonly configService: ConfigService) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    this.allowedOrigins = frontendUrl.includes(',')
      ? frontendUrl.split(',').map((url) => url.trim().toLowerCase())
      : [frontendUrl.trim().toLowerCase()];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = (request.headers['origin'] as string | undefined)?.toLowerCase();

    // 1. Se Origin está presente (navegadores sempre enviam em POST / fetch com credenciais),
    // ele DEVE estar explicitamente configurado nas origens autorizadas.
    if (origin) {
      const normalizedOrigin = origin.replace(/\/$/, '');
      const isAllowed = this.allowedOrigins.some(
        (allowed) => allowed.replace(/\/$/, '') === normalizedOrigin,
      );

      if (!isAllowed) {
        throw new ForbiddenException(`Acesso negado: origem '${origin}' não autorizada por política de segurança.`);
      }
    }

    // 2. Requisições sem Origin (como CLI, smoke tests, ferramentas server-to-server) são permitidas,
    // pois não operam no contexto de navegador com ambient credentials vulneráveis a CSRF.
    return true;
  }
}
