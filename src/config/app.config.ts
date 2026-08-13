import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('application', () => ({
  name: 'potber-api',
  port: parseInt(process.env.APP_PORT, 10) || 3000,
  metricsPort: parseInt(process.env.APP_METRICS_PORT, 10) || 9100,
  clientUrl: process.env.APP_CLIENT_URL ?? 'https://potber.de',
  apiUrl: process.env.APP_API_URL ?? 'https://api.potber.de',
  logging: {
    level: process.env.APP_LOG_LEVEL ?? 'verbose',
  },
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET,
  },
}));

export type AppConfig = typeof appConfig;
