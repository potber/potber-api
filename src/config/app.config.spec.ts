import { appConfig } from './app.config';

describe('Config | AppConfig', () => {
  const originalJwtSecret = process.env.AUTH_JWT_SECRET;

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.AUTH_JWT_SECRET;
    } else {
      process.env.AUTH_JWT_SECRET = originalJwtSecret;
    }
  });

  test('uses the configured JWT secret value', () => {
    process.env.AUTH_JWT_SECRET = 'configured-secret';

    expect(appConfig().auth.jwtSecret).toBe('configured-secret');
  });
});
