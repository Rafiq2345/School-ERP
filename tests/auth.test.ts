import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import {
  generateSessionToken,
  hashSessionToken,
  computeFailedLoginState,
  checkAccountLockout,
} from '../src/lib/auth/session';
import { AccountLockedError, UnauthorizedError } from '../src/lib/errors/app-error';

describe('Authentication & Password Security', () => {
  it('should securely hash and verify valid passwords', async () => {
    const password = 'StrongPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toContain('scrypt$');
    expect(hash).not.toContain(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should reject short passwords under 8 characters', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
  });

  it('should generate unique 256-bit session tokens and deterministic hashes', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).not.toEqual(token2);
    expect(token1.length).toBe(64); // 32 bytes hex

    const hash1 = hashSessionToken(token1);
    const hash1Duplicate = hashSessionToken(token1);

    expect(hash1).toEqual(hash1Duplicate);
    expect(hash1).not.toEqual(token1);
  });

  it('should progressively lock account after 5 consecutive failed login attempts', () => {
    let state = { newAttempts: 0, newStatus: 'ACTIVE', lockoutUntil: null as Date | null };

    // 4 failed attempts should remain ACTIVE
    for (let i = 0; i < 4; i++) {
      state = computeFailedLoginState(state.newAttempts);
      expect(state.newStatus).toBe('ACTIVE');
      expect(state.lockoutUntil).toBeNull();
    }

    // 5th failed attempt triggers LOCKOUT
    state = computeFailedLoginState(state.newAttempts);
    expect(state.newAttempts).toBe(5);
    expect(state.newStatus).toBe('LOCKED');
    expect(state.lockoutUntil).toBeInstanceOf(Date);
    expect(state.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should throw AccountLockedError when evaluating locked account', () => {
    const futureLockout = new Date(Date.now() + 10 * 60 * 1000);
    expect(() => {
      checkAccountLockout({ status: 'LOCKED', lockoutUntil: futureLockout });
    }).toThrow(AccountLockedError);
  });

  it('should throw UnauthorizedError for INACTIVE account', () => {
    expect(() => {
      checkAccountLockout({ status: 'INACTIVE', lockoutUntil: null });
    }).toThrow(UnauthorizedError);
  });
});
