import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || "posster_boma2026_super_secret_fallback_key_998822";

export function signToken(username: string, expiresAt: number): string {
  const data = `${username}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
  return `${data}:${signature}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [username, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr);

  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${username}:${expiresAt}`)
    .digest('hex');

  return signature === expectedSignature && username === 'boma2026';
}
