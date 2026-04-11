import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 8081;
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:8080'];

  // ------------------------------------------------------------------ //
  // Global prefix — all routes under /api/v1
  // ------------------------------------------------------------------ //
  app.setGlobalPrefix('api/v1');

  // ------------------------------------------------------------------ //
  // CORS
  // ------------------------------------------------------------------ //
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedHeaders = ['Content-Type', 'Authorization'];
  // x-dev-user-email is only needed when Clerk is not configured (local dev)
  if (!isProduction) {
    allowedHeaders.push('x-dev-user-email');
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders,
  });

  // ------------------------------------------------------------------ //
  // Global pipes — validate & transform all incoming DTOs
  // ------------------------------------------------------------------ //
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,       // Auto-transform to DTO class instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ------------------------------------------------------------------ //
  // Global filters & interceptors
  // ------------------------------------------------------------------ //
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ------------------------------------------------------------------ //
  // Swagger — available at /api/docs (dev only; gated in production)
  // ------------------------------------------------------------------ //
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DockyDoc API')
      .setDescription('DockyDoc document management platform API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`Swagger docs  → http://localhost:${port}/api/docs`);
  }

  // ------------------------------------------------------------------ //
  // Start
  // ------------------------------------------------------------------ //
  await app.listen(port);
  console.log(`DockyDoc API  → http://localhost:${port}`);
  console.log(`Health check  → http://localhost:${port}/api/v1/health`);
}

bootstrap();
