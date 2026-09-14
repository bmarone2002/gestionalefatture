export function normalizeAuthUrl(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return undefined;
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function applyAuthUrlFromEnv(): string | undefined {
  const normalized = normalizeAuthUrl(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL);
  if (normalized) {
    process.env.AUTH_URL = normalized;
    process.env.NEXTAUTH_URL = normalized;
  }
  return normalized;
}
