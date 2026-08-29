import { describe, it, expect } from 'vitest';
import { AuditService, sanitizeAuditData } from '../src/lib/audit/audit-service';
import { runWithTenant } from '../src/lib/tenant/context';

describe('Universal Audit Engine & Sensitive Data Redaction', () => {
  it('should automatically redact passwords, tokens, and secret fields in audit payloads', () => {
    const rawData = {
      username: 'johndoe',
      password: 'PlainSecretPassword123!',
      passwordHash: 'scrypt$hashvalue',
      token: 'session_token_xyz',
      email: 'john@school.edu',
      profile: {
        mfaSecret: 'TOTP_SECRET_VALUE',
        cardNumber: '4111222233334444',
        bloodGroup: 'B+',
      },
    };

    const sanitizedJson = sanitizeAuditData(rawData);
    expect(sanitizedJson).not.toBeNull();

    const parsed = JSON.parse(sanitizedJson!);
    expect(parsed.username).toBe('johndoe');
    expect(parsed.email).toBe('john@school.edu');
    expect(parsed.profile.bloodGroup).toBe('B+');

    // Secrets MUST be redacted
    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.passwordHash).toBe('[REDACTED]');
    expect(parsed.token).toBe('[REDACTED]');
    expect(parsed.profile.mfaSecret).toBe('[REDACTED]');
    expect(parsed.profile.cardNumber).toBe('[REDACTED]');
  });

  it('should create a complete tenant-scoped audit record payload', () => {
    const tenant = { tenantId: 'tenant-001', tenantCode: 'SCH-01', schoolName: 'Test School' };

    runWithTenant(tenant, () => {
      const payload = AuditService.createAuditPayload({
        userId: 'usr-42',
        userRole: 'ACCOUNTANT',
        module: 'BILLING',
        entityType: 'FeeVoucher',
        entityId: 'vch-100',
        action: 'EDIT',
        oldValues: { amount: 5000, token: 'secret_1' },
        newValues: { amount: 4500, token: 'secret_2' },
        changeSummary: 'Applied 10% sibling discount',
      });

      expect(payload.tenantId).toBe('tenant-001');
      expect(payload.userId).toBe('usr-42');
      expect(payload.action).toBe('EDIT');
      expect(payload.oldValues).toContain('"token":"[REDACTED]"');
      expect(payload.newValues).toContain('"token":"[REDACTED]"');
      expect(payload.changeSummary).toBe('Applied 10% sibling discount');
    });
  });
});
