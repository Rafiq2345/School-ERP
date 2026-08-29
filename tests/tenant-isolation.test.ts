import { describe, it, expect } from 'vitest';
import {
  runWithTenant,
  getRequiredTenantContext,
  getOptionalTenantContext,
  assertTenantOwnership,
} from '../src/lib/tenant/context';
import { TenantIsolationError } from '../src/lib/errors/app-error';
import { TenantRepository } from '../src/lib/db/tenant-prisma';

describe('Tenant Isolation & Context Boundary', () => {
  it('should propagate tenant context correctly within runWithTenant', () => {
    const tenantA = {
      tenantId: 'tenant-sch-a',
      tenantCode: 'SCH-A',
      schoolName: 'School Alpha',
    };

    runWithTenant(tenantA, () => {
      const context = getRequiredTenantContext();
      expect(context.tenantId).toBe('tenant-sch-a');
      expect(context.tenantCode).toBe('SCH-A');
      expect(context.schoolName).toBe('School Alpha');
      expect(TenantRepository.getTenantId()).toBe('tenant-sch-a');
    });
  });

  it('should isolate concurrent execution contexts for different tenants', () => {
    const tenantA = { tenantId: 'tenant-a', tenantCode: 'A', schoolName: 'A' };
    const tenantB = { tenantId: 'tenant-b', tenantCode: 'B', schoolName: 'B' };

    runWithTenant(tenantA, () => {
      expect(getRequiredTenantContext().tenantId).toBe('tenant-a');

      // Nested or adjacent run
      runWithTenant(tenantB, () => {
        expect(getRequiredTenantContext().tenantId).toBe('tenant-b');
      });

      // Restores outer context
      expect(getRequiredTenantContext().tenantId).toBe('tenant-a');
    });
  });

  it('should throw TenantIsolationError if context accessed outside tenant scope', () => {
    expect(() => getRequiredTenantContext()).toThrow(TenantIsolationError);
    expect(getOptionalTenantContext()).toBeNull();
  });

  it('should assert tenant ownership and block cross-tenant resource access', () => {
    const tenantA = { tenantId: 'tenant-a', tenantCode: 'A', schoolName: 'A' };

    runWithTenant(tenantA, () => {
      // Accessing resource owned by same tenant -> OK
      expect(() => assertTenantOwnership('tenant-a')).not.toThrow();

      // Accessing resource owned by another tenant (tenant-b) -> BLOCKED
      expect(() => assertTenantOwnership('tenant-b')).toThrow(TenantIsolationError);
      expect(() => TenantRepository.assertOwnership('tenant-b')).toThrow(TenantIsolationError);
    });
  });
});
