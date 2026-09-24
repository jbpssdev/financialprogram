import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cookie parser middleware for reading HttpOnly cookies
  app.use(cookieParser());

  // Global routing prefix
  app.setGlobalPrefix('api/v1');

  // Global DTO validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Dynamic CORS configuration (accepts single URL or comma-separated origins)
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
  const allowedOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map((url) => url.trim())
    : frontendUrl;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
void bootstrap();
