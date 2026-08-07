import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

type LoginThrottleScope = 'account' | 'ip';

type Tracker = {
  failures: number;
  windowExpiresAt: number;
  blockedUntil: number;
};

export type LoginThrottleDecision = {
  retryAfterSeconds: number;
  scope: LoginThrottleScope;
};

const WINDOW_MS = 10 * 60 * 1000;
const BASE_BLOCK_MS = 60 * 1000;
const MAX_BLOCK_MS = 15 * 60 * 1000;
const MAX_TRACKERS_PER_SCOPE = 10_000;
const MAX_FAILURES: Record<LoginThrottleScope, number> = {
  account: 5,
  ip: 20,
};

@Injectable()
export class LoginThrottleService {
  private readonly trackers: Record<LoginThrottleScope, Map<string, Tracker>> =
    {
      account: new Map(),
      ip: new Map(),
    };

  getDecision(ip: string, username: string): LoginThrottleDecision | undefined {
    const now = Date.now();
    const decisions = this.getKeys(ip, username)
      .map(({ scope, key }) => {
        const tracker = this.getActiveTracker(scope, key, now);
        if (!tracker || tracker.blockedUntil <= now) return undefined;

        return {
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((tracker.blockedUntil - now) / 1000),
          ),
          scope,
        } satisfies LoginThrottleDecision;
      })
      .filter((decision): decision is LoginThrottleDecision => !!decision);

    return decisions.sort(
      (left, right) => right.retryAfterSeconds - left.retryAfterSeconds,
    )[0];
  }

  recordFailure(ip: string, username: string): void {
    const now = Date.now();
    for (const { scope, key } of this.getKeys(ip, username)) {
      const tracker = this.getActiveTracker(scope, key, now) ?? {
        failures: 0,
        windowExpiresAt: now + WINDOW_MS,
        blockedUntil: 0,
      };
      tracker.failures += 1;

      if (tracker.failures >= MAX_FAILURES[scope]) {
        const exponent = tracker.failures - MAX_FAILURES[scope];
        tracker.blockedUntil =
          now + Math.min(BASE_BLOCK_MS * 2 ** exponent, MAX_BLOCK_MS);
      }

      this.storeTracker(scope, key, tracker);
    }
  }

  recordSuccess(username: string): void {
    this.trackers.account.delete(this.accountKey(username));
  }

  private getKeys(ip: string, username: string) {
    return [
      { scope: 'ip' as const, key: ip || 'unknown' },
      { scope: 'account' as const, key: this.accountKey(username) },
    ];
  }

  private accountKey(username: string): string {
    return createHash('sha256')
      .update(username.trim().toLowerCase())
      .digest('base64url');
  }

  private getActiveTracker(
    scope: LoginThrottleScope,
    key: string,
    now: number,
  ): Tracker | undefined {
    const tracker = this.trackers[scope].get(key);
    if (
      tracker &&
      tracker.windowExpiresAt <= now &&
      tracker.blockedUntil <= now
    ) {
      this.trackers[scope].delete(key);
      return undefined;
    }
    return tracker;
  }

  private storeTracker(
    scope: LoginThrottleScope,
    key: string,
    tracker: Tracker,
  ): void {
    const scopedTrackers = this.trackers[scope];
    if (
      !scopedTrackers.has(key) &&
      scopedTrackers.size >= MAX_TRACKERS_PER_SCOPE
    ) {
      const oldestKey = scopedTrackers.keys().next().value;
      if (oldestKey) scopedTrackers.delete(oldestKey);
    }
    scopedTrackers.set(key, tracker);
  }
}
