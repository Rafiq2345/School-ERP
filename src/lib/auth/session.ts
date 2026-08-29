import { randomBytes, createHash } from 'node:crypto';
import { AccountLockedError, UnauthorizedError } from '../errors/app-error';

export const SESSION_COOKIE_NAME = 'school_erp_session';
export const SESSION_DURATION_HOURS = 24;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Generates a cryptographically random 256-bit session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Creates a SHA-256 hash of a session token for secure database storage.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculates session expiration date.
 */
export function getSessionExpiration(hours = SESSION_DURATION_HOURS): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + hours);
  return expires;
}

/**
 * Evaluates account lockout status. Throws AccountLockedError if user is currently locked.
 */
export function checkAccountLockout(user: { status: string; lockoutUntil: Date | null }): void {
  if (user.status === 'LOCKED') {
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (1000 * 60));
      throw new AccountLockedError(
        `Account is locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`
      );
    }
  }

  if (user.status === 'INACTIVE') {
    throw new UnauthorizedError('Account is inactive. Please contact school administration.');
  }
}

/**
 * Computes next lockout state after a failed login attempt.
 */
export function computeFailedLoginState(currentAttempts: number): {
  newAttempts: number;
  newStatus: string;
  lockoutUntil: Date | null;
} {
  const newAttempts = currentAttempts + 1;
  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = new Date();
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
    return {
      newAttempts,
      newStatus: 'LOCKED',
      lockoutUntil,
    };
  }

  return {
    newAttempts,
    newStatus: 'ACTIVE',
    lockoutUntil: null,
  };
}
