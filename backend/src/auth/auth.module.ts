import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthCookiesService } from './auth-cookies.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OriginCsrfGuard } from './guards/origin-csrf.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthCookiesService, OriginCsrfGuard, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, AuthCookiesService, OriginCsrfGuard, JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}

