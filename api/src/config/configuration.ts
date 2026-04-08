/**
 * Typed configuration factory for NestJS ConfigModule.
 *
 * All environment variables are read here and exposed as a typed object.
 * Access via: configService.get<string>('jwt.secret')
 */
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '8081', 10),
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me_before_production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:8080').split(','),
  },
});
