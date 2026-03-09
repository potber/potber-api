import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { registerAs } from '@nestjs/config';
import { createCorsOriginMatcher, parseAllowedOrigins } from './cors.utils';

export const corsConfig = registerAs(
  'cors',
  (): CorsOptions => ({
    allowedHeaders: ['content-type', 'authorization'],
    origin: createCorsOriginMatcher(
      parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
    ),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

export type CorsConfig = typeof corsConfig;
