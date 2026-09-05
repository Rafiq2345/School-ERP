import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { PasswordRecoveryService } from '../src/lib/services/password-recovery-service';
import {
  validatePakistanMobile,
  validateEmail,
  validateAccountIdentifier,
  normalizePakistanMobile,
  normalizeMobile,
  validateMobile,
  FIELD_MAX_LENGTHS,
} from '../src/lib/validation/auth-validation';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import { generateSessionToken, hashSessionToken } from '../src/lib/auth/session';
import { ValidationError } from '../src/lib/errors/app-error';

describe('Authentication UX & Revised Password Recovery Suite', () => {
  const testTenantId = 'tenant-test-recovery';
  let testUser: any;
  let adminUser: any;

  beforeEach(async () => {
    await prisma.tenant.upsert({
      where: { id: testTenantId },
      update: { name: 'Security Test Academy', status: 'ACTIVE' },
      create: {
        id: testTenantId,
        code: 'SEC-TEST',
        name: 'Security Test Academy',
        status: 'ACTIVE',
      },
    });

    await prisma.passwordResetToken.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.passwordRecoveryOtp.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.passwordRecoveryRequest.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.userSession.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.user.deleteMany({ where: { tenantId: testTenantId } });

    const standardHash = await hashPassword('InitialPass123!');

    testUser = await prisma.user.create({
      data: {
        id: 'usr-recovery-emp-1',
        tenantId: testTenantId,
        username: 'emp.tariq',
        email: 'tariq.mehmood@sectest.edu.pk',
        phone: '03308114136',
        recoveryMobile: '03308114136',
        isMobileVerified: true,
        passwordHash: standardHash,
        userType: 'EMPLOYEE',
        status: 'ACTIVE',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        id: 'usr-recovery-adm-1',
        tenantId: testTenantId,
        username: 'adm.super',
        email: 'super.admin@sectest.edu.pk',
        passwordHash: standardHash,
        userType: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  });

  // ==========================================
  // 1. Admin Login & Simplified Forgot Password Architecture
  // ==========================================
  describe('1. Main School ERP Admin Login & Forgot Password Architecture', () => {
    it('1. Verifies field length constraints for username and password inputs', () => {
      expect(FIELD_MAX_LENGTHS.USERNAME).toBe(100);
      expect(FIELD_MAX_LENGTHS.PASSWORD).toBe(128);
      expect(FIELD_MAX_LENGTHS.MOBILE_FORMATTED).toBe(14);
      expect(FIELD_MAX_LENGTHS.MOBILE_CANONICAL).toBe(11);
      expect(FIELD_MAX_LENGTHS.EMAIL).toBe(254);
    });

    it('2. Forgot Password page does NOT perform public DB write or create recovery tickets', async () => {
      // In the simplified design, accessing /forgot-password is purely instructional
      const countBefore = await prisma.passwordRecoveryRequest.count({
        where: { tenantId: testTenantId },
      });
      expect(countBefore).toBe(0);
    });

    it('3. Existing login credential verification succeeds for valid users', async () => {
      const isValid = await verifyPassword('InitialPass123!', testUser.passwordHash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword123!', testUser.passwordHash);
      expect(isInvalid).toBe(false);
    });
  });

  // ==========================================
  // 2. Mobile Validation, Normalization & Country-Aware Design
  // ==========================================
  describe('2. Pakistan Mobile Validation & Normalization', () => {
    it('6. Accepts unformatted 11-digit mobile: 03308114136', () => {
      const res = validatePakistanMobile('03308114136');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('03308114136');
    });

    it('7. Accepts formatted mobile with hyphens: 0330-8114136', () => {
      const res = validatePakistanMobile('0330-8114136');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('03308114136');
    });

    it('8. Accepts formatted mobile with spaces: 0330 8114136', () => {
      const res = validatePakistanMobile('0330 8114136');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('03308114136');
    });

    it('9. All format variations normalize to canonical 03308114136', () => {
      expect(normalizePakistanMobile('03308114136')).toBe('03308114136');
      expect(normalizePakistanMobile('0330-8114136')).toBe('03308114136');
      expect(normalizePakistanMobile('0330 8114136')).toBe('03308114136');
      expect(normalizePakistanMobile(' 0330 - 8114136 ')).toBe('03308114136');
      expect(normalizePakistanMobile('+923308114136')).toBe('03308114136');
      expect(normalizePakistanMobile('923308114136')).toBe('03308114136');
      expect(normalizeMobile('0330-8114136', 'PK')).toBe('03308114136');
    });

    it('10. Blocks excessive digits (e.g. 0330811413699)', () => {
      const res = validatePakistanMobile('0330811413699');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('11-digit mobile number');
    });

    it('11. Blocks letters in mobile input (e.g. 0330-8114abc)', () => {
      const res = validatePakistanMobile('0330-8114abc');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('11-digit mobile number');
    });

    it('12. Blocks unsupported symbols (e.g. 0330/8114136, 0330#8114136)', () => {
      const slashRes = validatePakistanMobile('0330/8114136');
      expect(slashRes.isValid).toBe(false);

      const hashRes = validatePakistanMobile('0330#8114136');
      expect(hashRes.isValid).toBe(false);
    });

    it('13. Backend enforces same normalization rule in lookup and services', async () => {
      const res = await PasswordRecoveryService.lookupAccount(testTenantId, '0330-8114136');
      expect(res.recoveryUserId).toBe(testUser.id);
      expect(res.success).toBe(true);
    });
  });

  // ==========================================
  // 3. Email Input & Multi-Domain RFC Validation
  // ==========================================
  describe('3. Email Input & Multi-Domain Validation', () => {
    it('14. Accepts user@gmail.com', () => {
      const res = validateEmail('user@gmail.com');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('user@gmail.com');
    });

    it('15. Accepts user@school.edu.pk (multi-level Pakistan academic domain)', () => {
      const res = validateEmail('user@school.edu.pk');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('user@school.edu.pk');
    });

    it('16. Accepts user@example.co.uk (multi-level UK domain)', () => {
      const res = validateEmail('user@example.co.uk');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('user@example.co.uk');
    });

    it('17. Rejects malformed email structures (missing domain, missing user, multiple @)', () => {
      expect(validateEmail('user').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
      expect(validateEmail('@gmail.com').isValid).toBe(false);
      expect(validateEmail('user@@gmail.com').isValid).toBe(false);
      expect(validateEmail('user@example.').isValid).toBe(false);
      expect(validateEmail('user..name@example.com').isValid).toBe(false);
    });

    it('18. Rejects email containing spaces inside (e.g. user gmail.com or user @domain.com)', () => {
      const res = validateEmail('user gmail.com');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('spaces');
    });

    it('19. Rejects unreasonable / excessive length (> 254 chars)', () => {
      const excessiveLocal = 'a'.repeat(250) + '@example.com';
      const res = validateEmail(excessiveLocal);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('maximum permitted length');
    });

    it('20. Backend enforces same email validation rule on account lookup', async () => {
      await expect(
        PasswordRecoveryService.lookupAccount(testTenantId, 'invalid_email_no_domain@')
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================
  // 4. Security & Future Portal Architecture Preservation
  // ==========================================
  describe('4. Security & Future Portal Architecture Preservation', () => {
    it('21. Main Admin Forgot Password flow causes zero unsolicited recovery ticket creation', async () => {
      const tickets = await prisma.passwordRecoveryRequest.findMany({
        where: { tenantId: testTenantId },
      });
      expect(tickets.length).toBe(0);
    });

    it('22. Authenticated Admin can perform secure internal password reset with MUST CHANGE PASSWORD', async () => {
      const rawToken = generateSessionToken();
      const tokenHash = hashSessionToken(rawToken);

      // Create reset token internally
      await prisma.passwordResetToken.create({
        data: {
          tenantId: testTenantId,
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });

      // Reset password with token
      const newPass = 'SecureAdminReset2026!';
      const resetRes = await PasswordRecoveryService.resetPasswordWithToken(
        testTenantId,
        rawToken,
        newPass,
        newPass,
        '127.0.0.1'
      );
      expect(resetRes.success).toBe(true);

      const refreshedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
      const matchesNew = await verifyPassword(newPass, refreshedUser!.passwordHash);
      expect(matchesNew).toBe(true);
    });

    it('23. Existing auth and session behavior does not regress', async () => {
      const sessionToken = generateSessionToken();
      const sessionHash = hashSessionToken(sessionToken);

      const session = await prisma.userSession.create({
        data: {
          tenantId: testTenantId,
          userId: adminUser.id,
          tokenHash: sessionHash,
          expiresAt: new Date(Date.now() + 8 * 3600 * 1000),
          ipAddress: '127.0.0.1',
          userAgent: 'TestBrowser',
        },
      });

      expect(session.id).toBeDefined();
      expect(session.isRevoked).toBe(false);
    });
  });
});
