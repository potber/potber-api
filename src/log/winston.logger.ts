import { WinstonModule } from 'nest-winston';
import { appConfig } from 'src/config/app.config';
import * as winston from 'winston';

const normalizeNestMetadata = winston.format((info) => {
  if (Array.isArray(info.stack)) {
    const stack = info.stack.filter(Boolean).join('\n');
    if (stack) {
      info.stack = stack;
    } else {
      delete info.stack;
    }
  }

  if (info.error instanceof Error) {
    info.error_type = info.error.name;
    info.error_message = info.error.message;

    if (!info.stack && info.error.stack) {
      info.stack = info.error.stack;
    }

    delete info.error;
  }

  return info;
});

export function createNestLogger() {
  const config = appConfig();
  const appName = config.name;
  const { level } = config.logging;
  const transports: winston.transport[] = [
    new winston.transports.Console({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ];

  return WinstonModule.createLogger({
    level,
    defaultMeta: {
      environment: process.env.NODE_ENV ?? 'development',
      service: appName,
    },
    format: winston.format.combine(
      winston.format.splat(),
      normalizeNestMetadata(),
    ),
    transports,
  });
}
