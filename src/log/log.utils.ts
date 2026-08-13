export function getLogPath(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url.split(/[?#]/, 1)[0];
  }
}
