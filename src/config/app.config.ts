import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('application', () => ({
  name: process.env.APPSIGNAL_APP_NAME ?? 'potber-api',
  port: parseInt(process.env.APP_PORT, 10) || 3000,
  metricsPort: parseInt(process.env.APP_METRICS_PORT, 10) || 9100,
  clientUrl: process.env.APP_CLIENT_URL ?? 'https://potber.de',
  apiUrl: process.env.APP_API_URL ?? 'https://api.potber.de',
  logging: {
    level: process.env.APP_LOG_LEVEL ?? 'verbose',
    appsignal: {
      enabled: Boolean(process.env.APPSIGNAL_PUSH_API_KEY?.trim()),
      group: process.env.APPSIGNAL_LOG_GROUP ?? 'app',
    },
  },
  auth: {
    jwtSecret: process.env,
  },
}));

export type AppConfig = typeof appConfig;
