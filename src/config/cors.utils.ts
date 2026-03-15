function getNormalizedPort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  if (url.protocol === 'https:') {
    return '443';
  }

  if (url.protocol === 'http:') {
    return '80';
  }

  return '';
}

function parseOrigin(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function matchesWildcardHostname(
  requestedHostname: string,
  wildcardSuffix: string,
): boolean {
  const normalizedRequestedHostname = requestedHostname.toLowerCase();
  const normalizedWildcardSuffix = wildcardSuffix.toLowerCase();

  if (!normalizedRequestedHostname.endsWith(`.${normalizedWildcardSuffix}`)) {
    return false;
  }

  const label = normalizedRequestedHostname.slice(
    0,
    normalizedRequestedHostname.length - normalizedWildcardSuffix.length - 1,
  );

  return label.length > 0 && !label.includes('.');
}

export function matchesAllowedOrigin(
  allowedOrigin: string,
  requestedOrigin: string,
): boolean {
  const allowedUrl = parseOrigin(allowedOrigin);
  const requestedUrl = parseOrigin(requestedOrigin);

  if (!allowedUrl || !requestedUrl) {
    return false;
  }

  if (
    allowedUrl.protocol !== requestedUrl.protocol ||
    getNormalizedPort(allowedUrl) !== getNormalizedPort(requestedUrl)
  ) {
    return false;
  }

  if (allowedUrl.hostname.startsWith('*.')) {
    return matchesWildcardHostname(
      requestedUrl.hostname,
      allowedUrl.hostname.slice(2),
    );
  }

  return allowedUrl.hostname === requestedUrl.hostname;
}

export function parseAllowedOrigins(
  allowedOriginsValue: string | undefined,
): string[] {
  return (allowedOriginsValue ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createCorsOriginMatcher(
  allowedOrigins: string[],
): (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => void {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowed = allowedOrigins.some((allowedOrigin) =>
      matchesAllowedOrigin(allowedOrigin, origin),
    );

    callback(null, allowed);
  };
}
