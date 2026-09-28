const AUTH_SECRET_MIN_LENGTH = 32;

export function readAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < AUTH_SECRET_MIN_LENGTH) {
    throw new Error(`AUTH_SECRET must be set in .env to at least ${AUTH_SECRET_MIN_LENGTH} characters.`);
  }
  return secret;
}
