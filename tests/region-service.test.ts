import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegionService } from '../src/lib/services/region-service';
import { prisma } from '../src/lib/db/prisma';
import * as passwordModule from '../src/lib/auth/password';

vi.mock('../src/lib/auth/password', () => ({
  hashPassword: vi.fn().mockImplementation(async (pw: string) => `hashed_${pw}`),
  verifyPassword: vi.fn().mockImplementation(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    headOffice: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    region: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    schoolProfile: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    country: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    stateProvince: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    city: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    globalTimezone: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    globalCurrency: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    employee: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
    },
  };

  return { prisma: mockPrisma };
});

describe('RegionService (Phase 2: Region Management)', () => {
  const mockTenantId = 'tenant-sch-001';
  const mockUserId = 'usr-admin-01';
  const mockHeadOfficeId = 'ho-khi-001';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.country.count).mockResolvedValue(1);
    vi.mocked(prisma.headOffice.count).mockResolvedValue(1);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.region.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
      id: mockHeadOfficeId,
      tenantId: mockTenantId,
      name: 'Karachi Central Head Office',
      code: 'HO-KHI-001',
      city: 'Karachi',
      state: 'Sindh',
      country: 'Pakistan',
      status: 'ACTIVE',
    } as any);
  });

  describe('ensureDefaultRegion', () => {
    it('should create default region when count is 0', async () => {
      vi.mocked(prisma.region.count).mockResolvedValue(0);

      const createdObj = {
        id: 'reg-default-01',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh & Karachi Region',
        code: 'REG-KHI-001',
        shortName: 'SSK-REG',
        registrationNo: 'REG-REG-001',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        phone: '+92 21 34567800',
        email: 'region.south@greenwood.edu.pk',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.region.create).mockResolvedValue(createdObj as any);

      const result = await RegionService.ensureDefaultRegion(mockTenantId, mockUserId);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('REG-KHI-001');
      expect(prisma.region.create).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if regions already exist', async () => {
      vi.mocked(prisma.region.count).mockResolvedValue(2);
      const result = await RegionService.ensureDefaultRegion(mockTenantId);
      expect(result).toBeNull();
      expect(prisma.region.create).not.toHaveBeenCalled();
    });
  });

  describe('generateRegionCode', () => {
    it('should generate formatted code using city prefix', async () => {
      vi.mocked(prisma.region.findMany).mockResolvedValue([]);
      const code = await RegionService.generateRegionCode(mockTenantId, 'KHI');
      expect(code).toBe('REG-KHI-001');
    });

    it('should increment sequence if regions with prefix exist', async () => {
      vi.mocked(prisma.region.findMany).mockResolvedValue([
        { code: 'REG-LHR-001' },
      ] as any);
      const code = await RegionService.generateRegionCode(mockTenantId, 'LHR');
      expect(code).toBe('REG-LHR-002');
    });
  });

  describe('getRegions', () => {
    it('should return list of regions, parent head office info, login user info, and aggregate stats', async () => {
      vi.mocked(prisma.region.count).mockResolvedValue(2);
      const mockList = [
        {
          id: 'reg-1',
          tenantId: mockTenantId,
          headOfficeId: mockHeadOfficeId,
          name: 'Southern Sindh & Karachi Region',
          code: 'REG-KHI-001',
          shortName: 'SSK-REG',
          registrationNo: 'REG-001',
          addressLine1: 'Plot 10, Shahrah-e-Faisal',
          city: 'Karachi',
          state: 'Sindh',
          country: 'Pakistan',
          phone: '+92 21 34567800',
          email: 'region.south@greenwood.edu.pk',
          logoUrl: '/uploads/reg-logo.png',
          signatureUrl: '/uploads/reg-sig.png',
          stampUrl: '/uploads/reg-stamp.png',
          status: 'ACTIVE',
          headOffice: { id: mockHeadOfficeId, name: 'Karachi Central Head Office', code: 'HO-KHI-001' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'reg-2',
          tenantId: mockTenantId,
          headOfficeId: mockHeadOfficeId,
          name: 'Northern Punjab Region',
          code: 'REG-LHR-001',
          shortName: 'NP-REG',
          registrationNo: null,
          addressLine1: 'Main Gulberg',
          city: 'Lahore',
          state: 'Punjab',
          country: 'Pakistan',
          phone: '+92 42 35789000',
          email: 'region.north@greenwood.edu.pk',
          logoUrl: null,
          signatureUrl: null,
          stampUrl: null,
          status: 'ACTIVE',
          headOffice: { id: mockHeadOfficeId, name: 'Karachi Central Head Office', code: 'HO-KHI-001' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.region.findMany)
        .mockResolvedValueOnce(mockList as any) // filtered items
        .mockResolvedValueOnce([
          { id: 'reg-1', status: 'ACTIVE', city: 'Karachi', headOfficeId: mockHeadOfficeId },
          { id: 'reg-2', status: 'ACTIVE', city: 'Lahore', headOfficeId: mockHeadOfficeId },
        ] as any); // all records for stats

      vi.mocked(prisma.headOffice.findMany).mockResolvedValue([
        { id: mockHeadOfficeId, name: 'Karachi Central Head Office', code: 'HO-KHI-001', city: 'Karachi', status: 'ACTIVE' },
      ] as any);

      const result = await RegionService.getRegions(mockTenantId, { search: 'Sindh' });
      expect(result.items).toHaveLength(2);
      expect(result.stats.total).toBe(2);
      expect(result.stats.active).toBe(2);
      expect(result.stats.inactive).toBe(0);
      expect(result.stats.archived).toBe(0);
      expect(result.stats.headOfficesCount).toBe(1);
      expect(result.stats.citiesCount).toBe(2);
      expect(result.stats.availableHeadOffices).toHaveLength(1);
      expect(result.items[0].logoUrl).toBe('/uploads/reg-logo.png');
      expect(result.items[0].loginUsername).toBe('reg_khi_001');
    });
  });

  describe('createRegion', () => {
    it('should create region with mandatory parent head office, branding assets, and linked login user', async () => {
      vi.mocked(prisma.region.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: 'usr-reg-isb' } as any);
      vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: 'role-regadmin', code: 'REGION_ADMIN' } as any);
      vi.mocked(prisma.userRole.create).mockResolvedValue({ id: 'ur-1' } as any);

      const input = {
        headOfficeId: mockHeadOfficeId,
        name: 'Islamabad Capital Region',
        code: 'reg-isb-001',
        shortName: 'isb-reg',
        registrationNo: 'REG-ISB-001',
        addressLine1: 'Sector F-8/3, Street 12',
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        phone: '+92 51 2345600',
        email: 'isb.reg@greenwood.edu.pk',
        logoUrl: '/uploads/isb-logo.png',
        signatureUrl: '/uploads/isb-sig.png',
        stampUrl: '/uploads/isb-stamp.png',
        loginUsername: 'reg_isb_admin',
        loginPassword: 'SecurePassword2026!',
        loginStatus: 'ACTIVE' as const,
      };

      const createdObj = {
        id: 'reg-3',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Islamabad Capital Region',
        code: 'REG-ISB-001',
        shortName: 'ISB-REG',
        registrationNo: 'REG-ISB-001',
        addressLine1: 'Sector F-8/3, Street 12',
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        phone: '+92 51 2345600',
        email: 'isb.reg@greenwood.edu.pk',
        logoUrl: '/uploads/isb-logo.png',
        signatureUrl: '/uploads/isb-sig.png',
        stampUrl: '/uploads/isb-stamp.png',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.region.create).mockResolvedValue(createdObj as any);

      const res = await RegionService.createRegion(mockTenantId, input, mockUserId);
      expect(res.code).toBe('REG-ISB-001');
      expect(res.shortName).toBe('ISB-REG');
      expect(res.headOfficeId).toBe(mockHeadOfficeId);
      expect(res.logoUrl).toBe('/uploads/isb-logo.png');
      expect(res.loginUsername).toBe('reg_isb_admin');

      expect(prisma.region.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            headOfficeId: mockHeadOfficeId,
            code: 'REG-ISB-001',
            name: 'Islamabad Capital Region',
            logoUrl: '/uploads/isb-logo.png',
            signatureUrl: '/uploads/isb-sig.png',
            stampUrl: '/uploads/isb-stamp.png',
          }),
        })
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            username: 'reg_isb_admin',
            passwordHash: 'hashed_SecurePassword2026!',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should throw error when parent head office is missing or invalid', async () => {
      // 1. Empty headOfficeId
      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: '',
          name: 'Orphan Region',
          code: 'REG-ORPHAN',
        })
      ).rejects.toThrow('Parent Head Office selection is mandatory');

      // 2. Head office does not exist in tenant
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue(null);
      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: 'invalid-ho-id',
          name: 'Invalid Parent Region',
          code: 'REG-INV',
        })
      ).rejects.toThrow('Selected Parent Head Office does not exist');
    });

    it('should throw error on missing required name or code', async () => {
      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          name: '',
          code: 'REG-TEST',
        })
      ).rejects.toThrow('Region Name is required.');

      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          name: 'Test Region',
          code: '',
        })
      ).rejects.toThrow('Region Code is required.');
    });

    it('should throw error if region code already exists in tenant', async () => {
      vi.mocked(prisma.region.findUnique).mockResolvedValue({
        id: 'reg-existing',
        tenantId: mockTenantId,
        code: 'REG-KHI-001',
      } as any);

      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          name: 'Duplicate Region',
          code: 'REG-KHI-001',
        })
      ).rejects.toThrow('already exists');
    });

    it('should throw error if login username is too short or already taken', async () => {
      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          name: 'Test Region',
          code: 'REG-TST',
          loginUsername: 'ab',
        })
      ).rejects.toThrow('Login ID / Username must be at least 3 characters.');

      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'usr-existing' } as any);
      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          name: 'Test Region',
          code: 'REG-TST',
          loginUsername: 'existing_admin',
        })
      ).rejects.toThrow('already in use');
    });
  });

  describe('updateRegion', () => {
    it('should update region details and reset login password successfully', async () => {
      const existing = {
        id: 'reg-1',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Old Region Name',
        code: 'REG-01',
        status: 'ACTIVE',
        logoUrl: null,
      };

      vi.mocked(prisma.region.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.region.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'usr-reg-1',
        username: 'reg_01',
        status: 'ACTIVE',
      } as any);

      const updated = {
        ...existing,
        name: 'Updated Region Name',
        logoUrl: '/uploads/new-reg-logo.png',
      };
      vi.mocked(prisma.region.update).mockResolvedValue(updated as any);

      const res = await RegionService.updateRegion(
        mockTenantId,
        'reg-1',
        {
          name: 'Updated Region Name',
          logoUrl: '/uploads/new-reg-logo.png',
          loginPassword: 'NewStrongPassword2026!',
        },
        mockUserId
      );

      expect(res.name).toBe('Updated Region Name');
      expect(prisma.region.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr-reg-1' },
          data: expect.objectContaining({
            passwordHash: 'hashed_NewStrongPassword2026!',
          }),
        })
      );
    });
  });

  describe('toggleRegionStatus & archiveRegion', () => {
    it('should safely toggle status from ACTIVE to INACTIVE with audit reason', async () => {
      const existing = {
        id: 'reg-1',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh & Karachi Region',
        code: 'REG-KHI-001',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.region.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.region.update).mockResolvedValue({
        ...existing,
        status: 'INACTIVE',
      } as any);

      const res = await RegionService.toggleRegionStatus(
        mockTenantId,
        'reg-1',
        'INACTIVE',
        'Administrative reorganization',
        mockUserId
      );

      expect(res.status).toBe('INACTIVE');
      expect(prisma.region.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reg-1' },
          data: { status: 'INACTIVE' },
        })
      );
    });

    it('should archive region with reason', async () => {
      const existing = {
        id: 'reg-1',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh & Karachi Region',
        code: 'REG-KHI-001',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.region.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.region.update).mockResolvedValue({
        ...existing,
        status: 'ARCHIVED',
      } as any);

      const res = await RegionService.archiveRegion(
        mockTenantId,
        'reg-1',
        'Merged into Central Region',
        mockUserId
      );

      expect(res.status).toBe('ARCHIVED');
      expect(prisma.region.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reg-1' },
          data: { status: 'ARCHIVED' },
        })
      );
    });
  });

  describe('getRegionAuditLogs', () => {
    it('should return audit trail for region', async () => {
      const mockLogs = [
        {
          id: 'log-reg-1',
          tenantId: mockTenantId,
          entityType: 'REGION',
          entityId: 'reg-1',
          action: 'CREATE',
          changeSummary: 'Created Region',
          userId: mockUserId,
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);

      const logs = await RegionService.getRegionAuditLogs(mockTenantId, 'reg-1');
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('CREATE');
    });
  });
});
