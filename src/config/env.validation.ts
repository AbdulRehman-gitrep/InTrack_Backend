export function validateEnv(config: Record<string, unknown>) {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
  ];

  const missing = requiredVars.filter((key) => {
    const value = config[key];
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    );
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
}
