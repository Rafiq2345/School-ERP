import { describe, it, expect } from 'vitest';
import { checkRateLimit, resetRateLimit } from '../src/lib/security/rate-limit';
import { formatErrorResponse } from '../src/lib/errors/handler';
import { ValidationError } from '../src/lib/errors/app-error';

describe('Security & Error Handling Baseline', () => {
  it('should enforce sliding window rate limiting on sensitive requests', () => {
    const key = 'test-ip-auth-1';
    resetRateLimit(key);

    // Max 3 requests
    const res1 = checkRateLimit(key, 3, 1000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(key, 3, 1000);
    expect(res2.allowed).toBe(true);

    const res3 = checkRateLimit(key, 3, 1000);
    expect(res3.allowed).toBe(true);

    // 4th request should be blocked
    const res4 = checkRateLimit(key, 3, 1000);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.resetTimeMs).toBeGreaterThan(0);
  });

  it('should format operational AppErrors with appropriate HTTP status and details', () => {
    const validationErr = new ValidationError('Invalid input data', { field: 'username' });
    const formatted = formatErrorResponse(validationErr);

    expect(formatted.status).toBe(422);
    expect(formatted.body.success).toBe(false);
    expect(formatted.body.error.code).toBe('VALIDATION_ERROR');
    expect(formatted.body.error.message).toBe('Invalid input data');
    expect(formatted.body.error.details).toEqual({ field: 'username' });
  });

  it('should mask internal error stack traces and sensitive error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    const internalErr = new Error('Database connection failed at postgres://user:secret@10.0.0.1');
    const formatted = formatErrorResponse(internalErr);

    expect(formatted.status).toBe(500);
    expect(formatted.body.success).toBe(false);
    expect(formatted.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(formatted.body.error.message).not.toContain('postgres://');
    expect(formatted.body.error.message).toBe(
      'An unexpected server error occurred. Please try again later.'
    );

    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });
});
