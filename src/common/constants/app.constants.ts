export const PASSWORD = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
} as const;

export const RATE_LIMIT = {
  LOGIN: { limit: 5, ttl: 60_000 },
  GLOBAL: { limit: 100, ttl: 60_000 },
} as const;

export const TOKEN = {
  EXPIRES_IN: '15m',
} as const;
