import { getLogPath } from './log.utils';

describe('getLogPath', () => {
  it.each([
    ['/threads?token=secret', '/threads'],
    ['https://forum.mods.de/thread.php?TID=123#post', '/thread.php'],
    ['/healthz', '/healthz'],
  ])('removes sensitive URL components from %s', (url, expected) => {
    expect(getLogPath(url)).toBe(expected);
  });

  it('preserves an absent URL', () => {
    expect(getLogPath()).toBeUndefined();
  });
});
