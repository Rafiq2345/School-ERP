import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleSettingsService } from '../src/lib/services/module-settings-service';
import { prisma } from '../src/lib/db/prisma';

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    moduleFeatureToggle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

describe('Central Module & Feature Settings Service Tests', () => {
  const tenantId = 'tenant-sch-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves tenant module settings with core protected rules', async () => {
    vi.mocked(prisma.moduleFeatureToggle.findMany).mockResolvedValue([
      {
        id: '1',
        tenantId,
        moduleCode: 'LIBRARY',
        isEnabled: true,
        configOverrides: { OVERDUE_FINES: true },
        updatedAt: new Date(),
      },
    ]);

    const settings = await ModuleSettingsService.getTenantModuleSettings(tenantId, 'BASE');
    expect(settings.length).toBeGreaterThanOrEqual(20);

    const configModule = settings.find((m) => m.code === 'CONFIG');
    expect(configModule?.isProtected).toBe(true);
    expect(configModule?.isEnabled).toBe(true);

    const libraryModule = settings.find((m) => m.code === 'LIBRARY');
    expect(libraryModule?.isEnabled).toBe(true);
    expect(libraryModule?.features.find((f) => f.key === 'OVERDUE_FINES')?.isEnabled).toBe(true);
  });

  it('prevents disabling protected core modules', async () => {
    await expect(
      ModuleSettingsService.toggleModule(tenantId, 'CONFIG', false, 'usr-admin-01')
    ).rejects.toThrow('cannot be disabled');

    await expect(
      ModuleSettingsService.toggleModule(tenantId, 'SECURITY', false, 'usr-admin-01')
    ).rejects.toThrow('cannot be disabled');
  });

  it('enables an optional module and creates audit log', async () => {
    vi.mocked(prisma.moduleFeatureToggle.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moduleFeatureToggle.upsert).mockResolvedValue({
      id: '1',
      tenantId,
      moduleCode: 'ACCOUNTS',
      isEnabled: true,
      configOverrides: null,
      updatedAt: new Date(),
    });

    const result = await ModuleSettingsService.toggleModule(tenantId, 'ACCOUNTS', true, 'usr-admin-01');
    expect(result.isEnabled).toBe(true);
    expect(prisma.moduleFeatureToggle.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'MODULE_ENABLE',
        entityType: 'MODULE_FEATURE_TOGGLE',
      }),
    });
  });

  it('validates feature dependencies when toggling granular capabilities', async () => {
    vi.mocked(prisma.moduleFeatureToggle.findUnique).mockResolvedValue({
      id: '1',
      tenantId,
      moduleCode: 'HR_PAYROLL',
      isEnabled: true,
      configOverrides: { PAYSLIPS: true, MONTHLY_PAYROLL: true },
      updatedAt: new Date(),
    });

    // Attempting to disable MONTHLY_PAYROLL while PAYSLIPS is active should throw dependency error
    await expect(
      ModuleSettingsService.toggleFeature(tenantId, 'HR_PAYROLL', 'MONTHLY_PAYROLL', false, 'usr-admin-01')
    ).rejects.toThrow('depends on it');
  });

  it('enforces backend requireModule and requireFeature checks', async () => {
    vi.mocked(prisma.moduleFeatureToggle.findUnique).mockResolvedValue({
      id: '1',
      tenantId,
      moduleCode: 'LIBRARY',
      isEnabled: false,
      configOverrides: null,
      updatedAt: new Date(),
    });

    await expect(
      ModuleSettingsService.requireModule(tenantId, 'LIBRARY')
    ).rejects.toThrow('is disabled');

    // Protected modules always pass
    const configAllowed = await ModuleSettingsService.requireModule(tenantId, 'CONFIG');
    expect(configAllowed).toBe(true);
  });
});
