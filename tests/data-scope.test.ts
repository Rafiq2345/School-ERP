import { describe, it, expect } from 'vitest';
import { DataScopeManager } from '../src/lib/scope/data-scope';
import { authorizeActionInScope } from '../src/lib/auth/scope-guard';
import { AuthenticatedUser } from '../src/lib/types';

describe('Central Data Scope & Scope Guard Tests', () => {
  const tenantId = 'tenant-sch-001';

  it('creates single-campus scope with campusId aliased to tenantId by default', () => {
    const scope = DataScopeManager.createScope({ tenantId });
    expect(scope.tenantId).toBe(tenantId);
    expect(scope.campusId).toBe(tenantId);
    expect(scope.organizationId).toBeUndefined();
    expect(scope.regionId).toBeUndefined();
  });

  it('applies scope filters to database query parameters seamlessly', () => {
    const scope = DataScopeManager.createScope({ tenantId });
    const filter = DataScopeManager.applyScopeFilter(scope, { isActive: true, status: 'ACTIVE' });

    expect(filter).toEqual({
      tenantId: 'tenant-sch-001',
      isActive: true,
      status: 'ACTIVE',
    });
  });

  it('evaluates entity in-scope validation correctly', () => {
    const scope = DataScopeManager.createScope({ tenantId });

    expect(DataScopeManager.isEntityInScope(scope, { tenantId: 'tenant-sch-001' })).toBe(true);
    expect(DataScopeManager.isEntityInScope(scope, { tenantId: 'other-tenant' })).toBe(false);
  });

  it('separates Permission (WHAT) from Scope Boundary (WHERE)', () => {
    const user: AuthenticatedUser = {
      id: 'usr-1',
      tenantId: 'tenant-sch-001',
      username: 'Accountant',
      email: 'accountant@school.edu.pk',
      userType: 'EMPLOYEE',
      preferredLocale: 'en',
      roles: ['ACCOUNTANT'],
      permissions: ['BILLING:VIEW', 'BILLING:CREATE'],
    };

    const validScope = DataScopeManager.createScope({ tenantId: 'tenant-sch-001' });
    const foreignScope = DataScopeManager.createScope({ tenantId: 'tenant-other-002' });

    // Permitted action within valid scope
    expect(() =>
      authorizeActionInScope(user, 'BILLING', 'VIEW', validScope)
    ).not.toThrow();

    // Denied action (lacks APPROVE permission - WHAT)
    expect(() =>
      authorizeActionInScope(user, 'BILLING', 'APPROVE', validScope)
    ).toThrow('Permission denied');

    // Denied action across foreign scope boundary (WHERE)
    expect(() =>
      authorizeActionInScope(user, 'BILLING', 'VIEW', foreignScope)
    ).toThrow('Scope violation');
  });
});
