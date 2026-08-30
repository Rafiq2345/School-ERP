import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ModuleSettingsService } from '../src/lib/services/module-settings-service';
import { prisma } from '../src/lib/db/prisma';

describe('Module & Feature Settings Live PostgreSQL Integration Tests', () => {
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new Error('No active tenant found');
    tenantId = tenant.id;
  });

  afterAll(async () => {
    // Clean up any test overrides for LIBRARY
    await prisma.moduleFeatureToggle.deleteMany({
      where: { tenantId, moduleCode: 'LIBRARY' },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  it('loads resolved module settings for active tenant from live PostgreSQL', async () => {
    const settings = await ModuleSettingsService.getTenantModuleSettings(tenantId, 'BASE');
    expect(settings.length).toBeGreaterThanOrEqual(20);

    const configMod = settings.find((m) => m.code === 'CONFIG');
    expect(configMod).toBeDefined();
    expect(configMod?.isProtected).toBe(true);
    expect(configMod?.isEnabled).toBe(true);
  });

  it('persists module toggle and feature override in PostgreSQL and records audit log', async () => {
    // 1. Enable optional LIBRARY module
    const enabledRecord = await ModuleSettingsService.toggleModule(
      tenantId,
      'LIBRARY',
      true,
      'usr-admin-01'
    );
    expect(enabledRecord.isEnabled).toBe(true);

    // 2. Toggle a granular feature (OVERDUE_FINES)
    const featRecord = await ModuleSettingsService.toggleFeature(
      tenantId,
      'LIBRARY',
      'OVERDUE_FINES',
      true,
      'usr-admin-01'
    );
    expect(featRecord.configOverrides).toBeDefined();
    const overrides = featRecord.configOverrides as Record<string, boolean>;
    expect(overrides['OVERDUE_FINES']).toBe(true);

    // 3. Verify backend guard works
    const isAllowed = await ModuleSettingsService.requireModule(tenantId, 'LIBRARY');
    expect(isAllowed).toBe(true);

    // 4. Verify audit log entry was written
    const audit = await prisma.auditLog.findFirst({
      where: { tenantId, entityType: 'MODULE_FEATURE_TOGGLE' },
      orderBy: { timestamp: 'desc' },
    });
    expect(audit).toBeDefined();
    expect(audit?.action).toContain('FEATURE_ENABLE');
  });
});
