import { describe, it, expect } from 'vitest';
import { getAuthorizedDashboardRoute } from '../src/lib/auth/router';
import { resolveTenantFromRequest } from '../src/lib/tenant/resolver';
import { UserType } from '../src/lib/types';
import { checkRateLimit, resetRateLimit } from '../src/lib/security/rate-limit';

describe('Login Flow & Server-Side Role Routing', () => {
  it('should automatically map userType to authorized dashboard without client-side role parameters', () => {
    expect(getAuthorizedDashboardRoute('ADMIN')).toBe('/admin');
    expect(getAuthorizedDashboardRoute('TEACHER')).toBe('/teacher');
    expect(getAuthorizedDashboardRoute('EMPLOYEE')).toBe('/staff');
    expect(getAuthorizedDashboardRoute('STUDENT')).toBe('/student');
    expect(getAuthorizedDashboardRoute('PARENT')).toBe('/parent');
    expect(getAuthorizedDashboardRoute('UNKNOWN' as UserType)).toBe('/login');
  });

  it('should resolve tenant context from subdomain headers without user manual input', () => {
    // Hosted SaaS subdomain header
    const headersSubdomain = new Headers();
    headersSubdomain.set('host', 'beaconhouse.schoolerp.com:3000');

    const tenantSubdomain = resolveTenantFromRequest(headersSubdomain);
    expect(tenantSubdomain.tenantCode).toBe('BEACONHOUSE');
    expect(tenantSubdomain.schoolName).toBe('Beaconhouse School');

    // Default installation fallback when accessed directly
    const defaultTenant = resolveTenantFromRequest();
    expect(defaultTenant.tenantCode).toBe('SCH-001');
    expect(defaultTenant.schoolName).toBe('Greenwood International School');
  });

  it('should enforce rate limits on login requests', () => {
    const ipKey = 'login-test-ip-99';
    resetRateLimit(ipKey);

    // First 5 attempts allowed
    for (let i = 0; i < 5; i++) {
      const check = checkRateLimit(ipKey, 5, 60000);
      expect(check.allowed).toBe(true);
    }

    // 6th attempt blocked
    const blockedCheck = checkRateLimit(ipKey, 5, 60000);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remaining).toBe(0);
  });
});
