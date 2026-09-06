import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegionService } from '../src/lib/services/region-service';
import { prisma } from '../src/lib/db/prisma';

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
  });

  describe('ensureDefaultRegion', () => {
    it('should create default region when count is 0', async () => {
      vi.mocked(prisma.region.count).mockResolvedValue(0);
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

      const createdObj = {
        id: 'reg-default-01',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh & Karachi Region',
        code: 'REG-KHI-001',
        shortName: 'SSK-REG',
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
    it('should return list of regions, parent head office info, and aggregate stats', async () => {
      vi.mocked(prisma.region.count).mockResolvedValue(2);
      const mockList = [
        {
          id: 'reg-1',
          tenantId: mockTenantId,
          headOfficeId: mockHeadOfficeId,
          name: 'Southern Sindh & Karachi Region',
          code: 'REG-KHI-001',
          shortName: 'SSK-REG',
          city: 'Karachi',
          state: 'Sindh',
          country: 'Pakistan',
          phone: '+92 21 34567800',
          email: 'region.south@greenwood.edu.pk',
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
          city: 'Lahore',
          state: 'Punjab',
          country: 'Pakistan',
          phone: '+92 42 35789000',
          email: 'region.north@greenwood.edu.pk',
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
    });
  });

  describe('createRegion', () => {
    it('should create region with uppercase code, parent head office attachment, and valid data', async () => {
      vi.mocked(prisma.region.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
        name: 'Karachi Central Head Office',
        country: 'Pakistan',
        state: 'Sindh',
        city: 'Karachi',
      } as any);

      const input = {
        headOfficeId: mockHeadOfficeId,
        name: 'Islamabad Capital Region',
        code: 'reg-isb-001',
        shortName: 'isb-reg',
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        phone: '+92 51 2345600',
        email: 'isb.reg@greenwood.edu.pk',
        coveredDistricts: 'Islamabad, Rawalpindi, Murree',
      };

      const createdObj = {
        id: 'reg-3',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Islamabad Capital Region',
        code: 'REG-ISB-001',
        shortName: 'ISB-REG',
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        phone: '+92 51 2345600',
        email: 'isb.reg@greenwood.edu.pk',
        coveredDistricts: 'Islamabad, Rawalpindi, Murree',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.region.create).mockResolvedValue(createdObj as any);

      const res = await RegionService.createRegion(mockTenantId, input, mockUserId);
      expect(res.code).toBe('REG-ISB-001');
      expect(res.shortName).toBe('ISB-REG');
      expect(prisma.region.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            headOfficeId: mockHeadOfficeId,
            code: 'REG-ISB-001',
            name: 'Islamabad Capital Region',
          }),
        })
      );
    });

    it('should throw error on missing parent head office', async () => {
      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: '',
          name: 'Region Test',
          code: 'REG-TEST-001',
        })
      ).rejects.toThrow('Parent Head Office selection is required.');
    });

    it('should throw error on invalid non-existent parent head office', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue(null);

      await expect(
        RegionService.createRegion(mockTenantId, {
          headOfficeId: 'invalid-ho-id',
          name: 'Region Test',
          code: 'REG-TEST-001',
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
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
      } as any);

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
  });

  describe('updateRegion', () => {
    it('should update region details successfully', async () => {
      const existing = {
        id: 'reg-1',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Old Region Name',
        code: 'REG-KHI-001',
        city: 'Karachi',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.region.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId } as any);
      vi.mocked(prisma.region.findUnique).mockResolvedValue(null);

      const updated = {
        ...existing,
        name: 'New Region Name Updated',
      };
      vi.mocked(prisma.region.update).mockResolvedValue(updated as any);

      const res = await RegionService.updateRegion(
        mockTenantId,
        'reg-1',
        { name: 'New Region Name Updated' },
        mockUserId
      );

      expect(res.name).toBe('New Region Name Updated');
      expect(prisma.region.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleRegionStatus and archiveRegion', () => {
    it('should safely toggle status from ACTIVE to INACTIVE with audit reason', async () => {
      const existing = {
        id: 'reg-1',
        tenantId: mockTenantId,
        name: 'Southern Sindh Region',
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
        'Reorganizing regional boundary',
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

    it('should safely archive region', async () => {
      const existing = {
        id: 'reg-1',
        tenantId: mockTenantId,
        name: 'Old Region',
        code: 'REG-OLD-001',
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
          id: 'log-1',
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
