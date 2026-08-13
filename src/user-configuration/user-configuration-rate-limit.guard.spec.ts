import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { UserConfigurationRateLimitGuard } from './user-configuration-rate-limit.guard';

describe('UserConfigurationRateLimitGuard', () => {
  const response = { setHeader: jest.fn() } as unknown as Response;

  beforeEach(() => jest.clearAllMocks());

  it('limits writes per authenticated user and sends Retry-After', () => {
    const guard = createGuard();
    const context = createContext('PUT', '123', '127.0.0.1');

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 60);
  });

  it('keeps user and read/write limits independent', () => {
    const guard = createGuard();

    expect(guard.canActivate(createContext('PUT', '123', '127.0.0.1'))).toBe(
      true,
    );
    expect(guard.canActivate(createContext('PUT', '456', '127.0.0.1'))).toBe(
      true,
    );
    expect(guard.canActivate(createContext('GET', '123', '127.0.0.1'))).toBe(
      true,
    );
  });

  function createGuard() {
    return new UserConfigurationRateLimitGuard(
      new ConfigService({
        USER_CONFIG_RATE_LIMIT_WINDOW_MS: 60_000,
        USER_CONFIG_RATE_LIMIT_READ_MAX: 2,
        USER_CONFIG_RATE_LIMIT_WRITE_MAX: 2,
        USER_CONFIG_RATE_LIMIT_IP_READ_MAX: 100,
        USER_CONFIG_RATE_LIMIT_IP_WRITE_MAX: 100,
      }),
    );
  }

  function createContext(method: string, userId: string, ip: string) {
    const request = {
      method,
      user: { userId },
      ip,
      socket: {},
    } as unknown as Request;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
  }
});
