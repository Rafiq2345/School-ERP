import { scrypt, randomBytes, timingSafeEqual, ScryptOptions } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS: ScryptOptions = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
};

function deriveScryptKey(password: string, salt: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Hashes a plaintext password using crypto scrypt with a unique random salt.
 * Format returned: `scrypt$N=16384,r=8,p=1$<salt_hex>$<derived_key_hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = await deriveScryptKey(password, salt, KEY_LENGTH);

  return `scrypt$N=${SCRYPT_OPTIONS.N},r=${SCRYPT_OPTIONS.r},p=${SCRYPT_OPTIONS.p}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }

  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = parts[2];
    const originalKeyHex = parts[3];
    const originalKey = Buffer.from(originalKeyHex, 'hex');

    const derivedKey = await deriveScryptKey(password, salt, originalKey.length);

    if (derivedKey.length !== originalKey.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, originalKey);
  } catch {
    return false;
  }
}
