import { LoginThrottleService } from './login-throttle.service';

describe('Auth | LoginThrottleService', () => {
  let service: LoginThrottleService;
  let now: number;

  beforeEach(() => {
    service = new LoginThrottleService();
    now = Date.parse('2026-08-07T12:00:00Z');
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('blocks an account after five failed logins', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.recordFailure('192.0.2.1', 'SomeUser');
    }

    expect(service.getDecision('198.51.100.2', 'someuser')).toStrictEqual({
      retryAfterSeconds: 60,
      scope: 'account',
    });
  });

  test('blocks an IP after failures against multiple accounts', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      service.recordFailure('192.0.2.1', `user-${attempt}`);
    }

    expect(service.getDecision('192.0.2.1', 'another-user')).toStrictEqual({
      retryAfterSeconds: 60,
      scope: 'ip',
    });
  });

  test('clears account failures after a successful login', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.recordFailure('192.0.2.1', 'SomeUser');
    }

    service.recordSuccess('someuser');

    expect(service.getDecision('198.51.100.2', 'SomeUser')).toBeUndefined();
  });

  test('increases the block after another failure in the same window', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.recordFailure('192.0.2.1', 'SomeUser');
    }
    now += 60 * 1000;

    service.recordFailure('192.0.2.1', 'SomeUser');

    expect(service.getDecision('198.51.100.2', 'someuser')).toStrictEqual({
      retryAfterSeconds: 120,
      scope: 'account',
    });
  });

  test('expires failures after the tracking window', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.recordFailure('192.0.2.1', 'SomeUser');
    }
    now += 10 * 60 * 1000;

    expect(service.getDecision('198.51.100.2', 'SomeUser')).toBeUndefined();
  });
});
