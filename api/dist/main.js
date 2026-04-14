"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
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
            console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
            process.exit(1);
        }
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = process.env.PORT ?? 8081;
    const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [
        'http://localhost:8080',
    ];
    app.setGlobalPrefix('api/v1');
    const allowedHeaders = ['Content-Type', 'Authorization'];
    if (!isProduction) {
        allowedHeaders.push('x-dev-user-email');
    }
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    if (!isProduction) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('DockyDoc API')
            .setDescription('DockyDoc document management platform API')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
        console.log(`Swagger docs  → http://localhost:${port}/api/docs`);
    }
    await app.listen(port, '0.0.0.0');
    console.log(`DockyDoc API  → http://0.0.0.0:${port}`);
    console.log(`Health check  → http://0.0.0.0:${port}/api/v1/health`);
}
bootstrap();
//# sourceMappingURL=main.js.map