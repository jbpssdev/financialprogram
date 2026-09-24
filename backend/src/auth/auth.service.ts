import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const access = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refresh = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!access || !access.trim()) {
      throw new Error('Configuração crítica ausente: JWT_ACCESS_SECRET é obrigatório.');
    }
    if (!refresh || !refresh.trim()) {
      throw new Error('Configuração crítica ausente: JWT_REFRESH_SECRET é obrigatório.');
    }
    if (access === refresh) {
      throw new Error('Violação de segurança: JWT_ACCESS_SECRET e JWT_REFRESH_SECRET não podem ser iguais.');
    }

    this.accessSecret = access;
    this.refreshSecret = refresh;
    this.accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    this.refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken || typeof refreshToken !== 'string' || !refreshToken.trim()) {
      throw new UnauthorizedException('Refresh token é obrigatório.');
    }

    let payload: { sub: string; email: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Lock pessimista da linha do usuário no PostgreSQL para eliminar race conditions / TOCTOU
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${payload.sub} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive || !user.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token inválido.');
      }

      const isMatch = await this.compareRefreshToken(refreshToken, user.refreshTokenHash);
      if (!isMatch) {
        throw new UnauthorizedException('Refresh token inválido.');
      }

      // Rotação: emite novo par e invalida o anterior
      const newPayload = { sub: user.id, email: user.email };
      const newAccessToken = this.generateAccessToken(newPayload);
      const newRefreshToken = this.generateRefreshToken(newPayload);

      const newRefreshTokenHash = await this.hashRefreshToken(newRefreshToken);

      await tx.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
        },
      };
    });
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { message: 'Logout realizado com sucesso.' };
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo.');
    }

    return user;
  }

  private generateAccessToken(payload: { sub: string; email: string }): string {
    return this.jwtService.sign(
      { ...payload, jti: crypto.randomUUID() },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as any,
      },
    );
  }

  private generateRefreshToken(payload: { sub: string; email: string }): string {
    return this.jwtService.sign(
      { ...payload, jti: crypto.randomUUID() },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as any,
      },
    );
  }

  private async hashRefreshToken(token: string): Promise<string> {
    const prehash = crypto.createHash('sha256').update(token).digest('hex');
    return bcrypt.hash(prehash, 10);
  }

  private async compareRefreshToken(token: string, hash: string): Promise<boolean> {
    const prehash = crypto.createHash('sha256').update(token).digest('hex');
    return bcrypt.compare(prehash, hash);
  }
}

