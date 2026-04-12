import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // ------------------------------------------------------------------ //
  // Startup validation — fail fast if critical env vars are missing in
  // production so misconfigured deploys surface immediately in logs.
  // ------------------------------------------------------------------ //
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const required = [
      'DATABASE_URL',
      'CORS_ORIGINS',
      'SHARE_GRANT_SECRET',
      'ENCRYPTION_KEY',
      'CLERK_SECRET_KEY',
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error(
        `FATAL: Missing required environment variables: ${missing.join(', ')}`,
      );
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 8081;
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [
    'http://localhost:8080',
  ];

  // ------------------------------------------------------------------ //
  // Global prefix — all routes under /api/v1
  // ------------------------------------------------------------------ //
  app.setGlobalPrefix('api/v1');

  // ------------------------------------------------------------------ //
  // CORS
  // ------------------------------------------------------------------ //
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
  // Listen on 0.0.0.0 so Render (and other cloud hosts) can route traffic in.
  // Listening on 127.0.0.1 (the NestJS default) is invisible outside the container.
  await app.listen(port, '0.0.0.0');
  console.log(`DockyDoc API  → http://0.0.0.0:${port}`);
  console.log(`Health check  → http://0.0.0.0:${port}/api/v1/health`);
}

bootstrap();
