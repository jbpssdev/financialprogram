import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthCookiesService, REFRESH_COOKIE_NAME } from './auth-cookies.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { OriginCsrfGuard } from './guards/origin-csrf.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookiesService: AuthCookiesService,
  ) {}

  @Public()
  @UseGuards(OriginCsrfGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    this.authCookiesService.setRefreshTokenCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Public()
  @UseGuards(OriginCsrfGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado.');
    }

    const { accessToken, refreshToken: newRefreshToken, user } =
      await this.authService.refresh(refreshToken);

    this.authCookiesService.setRefreshTokenCookie(res, newRefreshToken);
    return { accessToken, user };
  }

  @UseGuards(OriginCsrfGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(userId);
    this.authCookiesService.clearRefreshTokenCookie(res);
    return result;
  }

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}

