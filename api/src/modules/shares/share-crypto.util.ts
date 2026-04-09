/**
 * share-crypto.util.ts
 *
 * Cryptographic utilities for document sharing.
 * Uses only Node.js built-in `crypto` — no extra dependencies.
 *
 * Password hashing: scryptSync (strong KDF, no bcrypt needed)
 * Access grants:    HMAC-SHA256 signed tokens (stateless, no Redis needed)
 */

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

// ------------------------------------------------------------------ //
// Token generation
// ------------------------------------------------------------------ //

/** Generate a secure random share token (64-char hex). */
export function generateShareToken(): string {
  return randomBytes(32).toString('hex');
}

// ------------------------------------------------------------------ //
// Password hashing (scrypt)
// ------------------------------------------------------------------ //

const SCRYPT_KEYLEN = 32;
const SALT_BYTES = 16;

/** Hash a plain-text password. Returns "salt:hash" (both hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored "salt:hash" string.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const inputHash = scryptSync(password, salt, SCRYPT_KEYLEN);
    return timingSafeEqual(Buffer.from(hash, 'hex'), inputHash);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ //
// Access grants (HMAC-SHA256, short-lived)
// ------------------------------------------------------------------ //

const GRANT_TTL_SECONDS = 60 * 60; // 1 hour

function getGrantSecret(): string {
  const secret = process.env.SHARE_GRANT_SECRET;
  if (!secret) {
    throw new Error(
      'SHARE_GRANT_SECRET environment variable is not set. ' +
      'Generate a strong random secret (≥32 chars) and set it before starting the server. ' +
      'Example: openssl rand -hex 32',
    );
  }
  return secret;
}

/**
 * Create a short-lived, HMAC-signed access grant for a share.
 *
 * Format: base64url(shareId + '|' + expiry_unix) + '.' + hmac_hex
 *
 * The frontend stores this in memory/sessionStorage and sends it as
 * ?grant=<value> on subsequent requests (e.g. download).
 */
export function createAccessGrant(shareId: string): {
  grant: string;
  expiresIn: number;
} {
  const exp = Math.floor(Date.now() / 1000) + GRANT_TTL_SECONDS;
  const payload = Buffer.from(`${shareId}|${exp}`).toString('base64url');
  const sig = createHmac('sha256', getGrantSecret())
    .update(payload)
    .digest('hex');
  return { grant: `${payload}.${sig}`, expiresIn: GRANT_TTL_SECONDS };
}

/**
 * Verify an access grant.
 * Returns the shareId if valid, null if invalid/expired.
 */
export function verifyAccessGrant(grant: string): string | null {
  const dotIdx = grant.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const payload = grant.slice(0, dotIdx);
  const sig = grant.slice(dotIdx + 1);

  // Verify HMAC
  const expectedSig = createHmac('sha256', getGrantSecret())
    .update(payload)
    .digest('hex');
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return null;
    }
  } catch {
    return null;
  }

  // Decode and check expiry
  const decoded = Buffer.from(payload, 'base64url').toString();
  const [shareId, expStr] = decoded.split('|');
  if (!shareId || !expStr) return null;

  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;

  return shareId;
}
