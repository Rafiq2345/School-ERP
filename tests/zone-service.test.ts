import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZoneService } from '../src/lib/services/zone-service';
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
    zone: {
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

describe('ZoneService (Phase 3: Zone / Area Management)', () => {
  const mockTenantId = 'tenant-sch-001';
  const mockUserId = 'usr-admin-01';
  const mockHeadOfficeId = 'ho-khi-001';
  const mockRegionId = 'reg-khi-001';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.country.count).mockResolvedValue(1);
    vi.mocked(prisma.headOffice.count).mockResolvedValue(1);
    vi.mocked(prisma.region.count).mockResolvedValue(1);
  });

  describe('ensureDefaultZone', () => {
    it('should create default zone when count is 0', async () => {
      vi.mocked(prisma.zone.count).mockResolvedValue(0);
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

      vi.mocked(prisma.region.findFirst).mockResolvedValue({
        id: mockRegionId,
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh & Karachi Region',
        code: 'REG-KHI-001',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        status: 'ACTIVE',
      } as any);

      const createdObj = {
        id: 'zone-default-01',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: mockRegionId,
        name: 'Karachi Central Academic Zone',
        code: 'ZN-KHI-001',
        shortName: 'KC-ZONE',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        phone: '+92 21 34981122',
        email: 'zone.central@greenwood.edu.pk',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      const result = await ZoneService.ensureDefaultZone(mockTenantId, mockUserId);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('ZN-KHI-001');
      expect(prisma.zone.create).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if zones already exist', async () => {
      vi.mocked(prisma.zone.count).mockResolvedValue(2);
      const result = await ZoneService.ensureDefaultZone(mockTenantId);
      expect(result).toBeNull();
      expect(prisma.zone.create).not.toHaveBeenCalled();
    });
  });

  describe('generateZoneCode', () => {
    it('should generate formatted code using prefix', async () => {
      vi.mocked(prisma.zone.findMany).mockResolvedValue([]);
      const code = await ZoneService.generateZoneCode(mockTenantId, 'KHI');
      expect(code).toBe('ZN-KHI-001');
    });

    it('should increment sequence if zones with prefix exist', async () => {
      vi.mocked(prisma.zone.findMany).mockResolvedValue([
        { code: 'ZN-KHI-001' },
      ] as any);
      const code = await ZoneService.generateZoneCode(mockTenantId, 'KHI');
      expect(code).toBe('ZN-KHI-002');
    });
  });

  describe('getZones', () => {
    it('should return list of zones, parent hierarchy, direct HO count, and aggregate stats', async () => {
      vi.mocked(prisma.zone.count).mockResolvedValue(2);
      const mockList = [
        {
          id: 'zone-1',
          tenantId: mockTenantId,
          headOfficeId: mockHeadOfficeId,
          regionId: mockRegionId,
          name: 'Karachi Central Academic Zone',
          code: 'ZN-KHI-001',
          shortName: 'KC-ZONE',
          city: 'Karachi',
          state: 'Sindh',
          country: 'Pakistan',
          phone: '+92 21 34981122',
          email: 'zone.central@greenwood.edu.pk',
          status: 'ACTIVE',
          headOffice: { id: mockHeadOfficeId, name: 'Karachi Central Head Office', code: 'HO-KHI-001' },
          region: { id: mockRegionId, name: 'Southern Sindh & Karachi Region', code: 'REG-KHI-001' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'zone-2',
          tenantId: mockTenantId,
          headOfficeId: mockHeadOfficeId,
          regionId: null, // Direct Head Office Attachment
          name: 'Clifton & Defence Cluster',
          code: 'ZN-CLF-001',
          shortName: 'CD-ZONE',
          city: 'Karachi',
          state: 'Sindh',
          country: 'Pakistan',
          phone: '+92 21 35889900',
          email: 'zone.clifton@greenwood.edu.pk',
          status: 'ACTIVE',
          headOffice: { id: mockHeadOfficeId, name: 'Karachi Central Head Office', code: 'HO-KHI-001' },
          region: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.zone.findMany)
        .mockResolvedValueOnce(mockList as any) // filtered items
        .mockResolvedValueOnce([
          { id: 'zone-1', status: 'ACTIVE', city: 'Karachi', headOfficeId: mockHeadOfficeId, regionId: mockRegionId },
          { id: 'zone-2', status: 'ACTIVE', city: 'Karachi', headOfficeId: mockHeadOfficeId, regionId: null },
        ] as any); // all records for stats

      vi.mocked(prisma.headOffice.findMany).mockResolvedValue([
        { id: mockHeadOfficeId, name: 'Karachi Central Head Office', code: 'HO-KHI-001', city: 'Karachi', status: 'ACTIVE' },
      ] as any);

      vi.mocked(prisma.region.findMany).mockResolvedValue([
        { id: mockRegionId, name: 'Southern Sindh & Karachi Region', code: 'REG-KHI-001', shortName: 'SSK-REG', city: 'Karachi', status: 'ACTIVE', headOfficeId: mockHeadOfficeId },
      ] as any);

      const result = await ZoneService.getZones(mockTenantId, { search: 'Clifton' });
      expect(result.items).toHaveLength(2);
      expect(result.stats.total).toBe(2);
      expect(result.stats.active).toBe(2);
      expect(result.stats.inactive).toBe(0);
      expect(result.stats.archived).toBe(0);
      expect(result.stats.directHoCount).toBe(1);
      expect(result.stats.headOfficesCount).toBe(1);
      expect(result.stats.regionsCount).toBe(1);
      expect(result.stats.citiesCount).toBe(1);
      expect(result.stats.availableHeadOffices).toHaveLength(1);
      expect(result.stats.availableRegions).toHaveLength(1);
    });
  });

  describe('createZone', () => {
    it('should create zone with full hierarchy (HO -> Region -> Zone)', async () => {
      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
        name: 'Karachi Central Head Office',
        country: 'Pakistan',
        state: 'Sindh',
        city: 'Karachi',
      } as any);
      vi.mocked(prisma.region.findFirst).mockResolvedValue({
        id: mockRegionId,
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh & Karachi Region',
        country: 'Pakistan',
        state: 'Sindh',
        city: 'Karachi',
      } as any);

      const input = {
        headOfficeId: mockHeadOfficeId,
        regionId: mockRegionId,
        name: 'Gulshan Academic Zone',
        code: 'zn-gul-001',
        shortName: 'gul-zn',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        phone: '+92 21 34991100',
        email: 'gulshan.zone@greenwood.edu.pk',
        coveredDistricts: 'Gulshan-e-Iqbal, University Road',
      };

      const createdObj = {
        id: 'zone-3',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: mockRegionId,
        name: 'Gulshan Academic Zone',
        code: 'ZN-GUL-001',
        shortName: 'GUL-ZN',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        phone: '+92 21 34991100',
        email: 'gulshan.zone@greenwood.edu.pk',
        coveredDistricts: 'Gulshan-e-Iqbal, University Road',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      const res = await ZoneService.createZone(mockTenantId, input, mockUserId);
      expect(res.code).toBe('ZN-GUL-001');
      expect(res.shortName).toBe('GUL-ZN');
      expect(prisma.zone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            headOfficeId: mockHeadOfficeId,
            regionId: mockRegionId,
            code: 'ZN-GUL-001',
            name: 'Gulshan Academic Zone',
          }),
        })
      );
    });

    it('should create zone with direct Head Office attachment (no region)', async () => {
      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);
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
        regionId: null, // Direct attachment
        name: 'Direct Central Zone',
        code: 'ZN-DIR-001',
        shortName: 'DIR-ZN',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        phone: '+92 21 34998877',
        email: 'direct.zone@greenwood.edu.pk',
      };

      const createdObj = {
        id: 'zone-dir-01',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: null,
        name: 'Direct Central Zone',
        code: 'ZN-DIR-001',
        shortName: 'DIR-ZN',
        city: 'Karachi',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      const res = await ZoneService.createZone(mockTenantId, input, mockUserId);
      expect(res.code).toBe('ZN-DIR-001');
      expect(res.regionId).toBeNull();
      expect(prisma.zone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            headOfficeId: mockHeadOfficeId,
            regionId: null,
            code: 'ZN-DIR-001',
          }),
        })
      );
    });

    it('should throw error on missing parent head office', async () => {
      await expect(
        ZoneService.createZone(mockTenantId, {
          headOfficeId: '',
          name: 'Zone Test',
          code: 'ZN-TEST-001',
        })
      ).rejects.toThrow('Parent Head Office selection is required.');
    });

    it('should throw error when parent region does not belong to selected head office', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.region.findFirst).mockResolvedValue({
        id: 'reg-other-ho',
        tenantId: mockTenantId,
        headOfficeId: 'ho-other-id', // Mismatch!
        name: 'Other Region',
      } as any);

      await expect(
        ZoneService.createZone(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          regionId: 'reg-other-ho',
          name: 'Zone Test',
          code: 'ZN-TEST-001',
        })
      ).rejects.toThrow('Selected Parent Region does not belong to the selected Parent Head Office.');
    });

    it('should throw error on duplicate zone code', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
      } as any);

      vi.mocked(prisma.zone.findUnique).mockResolvedValue({
        id: 'zone-existing',
        tenantId: mockTenantId,
        code: 'ZN-KHI-001',
      } as any);

      await expect(
        ZoneService.createZone(mockTenantId, {
          headOfficeId: mockHeadOfficeId,
          name: 'Duplicate Zone',
          code: 'ZN-KHI-001',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateZone', () => {
    it('should update zone details successfully', async () => {
      const existing = {
        id: 'zone-1',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: mockRegionId,
        name: 'Old Zone Name',
        code: 'ZN-KHI-001',
        city: 'Karachi',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId } as any);
      vi.mocked(prisma.region.findFirst).mockResolvedValue({ id: mockRegionId, headOfficeId: mockHeadOfficeId } as any);
      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);

      const updated = {
        ...existing,
        name: 'New Zone Name Updated',
      };
      vi.mocked(prisma.zone.update).mockResolvedValue(updated as any);

      const res = await ZoneService.updateZone(
        mockTenantId,
        'zone-1',
        { name: 'New Zone Name Updated' },
        mockUserId
      );

      expect(res.name).toBe('New Zone Name Updated');
      expect(prisma.zone.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleZoneStatus and archiveZone', () => {
    it('should safely toggle status from ACTIVE to INACTIVE with audit reason', async () => {
      const existing = {
        id: 'zone-1',
        tenantId: mockTenantId,
        name: 'Karachi Central Zone',
        code: 'ZN-KHI-001',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.zone.update).mockResolvedValue({
        ...existing,
        status: 'INACTIVE',
      } as any);

      const res = await ZoneService.toggleZoneStatus(
        mockTenantId,
        'zone-1',
        'INACTIVE',
        'Restructuring cluster',
        mockUserId
      );

      expect(res.status).toBe('INACTIVE');
      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'zone-1' },
          data: { status: 'INACTIVE' },
        })
      );
    });

    it('should safely archive zone', async () => {
      const existing = {
        id: 'zone-1',
        tenantId: mockTenantId,
        name: 'Old Zone',
        code: 'ZN-OLD-001',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.zone.update).mockResolvedValue({
        ...existing,
        status: 'ARCHIVED',
      } as any);

      const res = await ZoneService.archiveZone(
        mockTenantId,
        'zone-1',
        'Merged into North Zone',
        mockUserId
      );

      expect(res.status).toBe('ARCHIVED');
      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'zone-1' },
          data: { status: 'ARCHIVED' },
        })
      );
    });
  });

  describe('getZoneAuditLogs', () => {
    it('should return audit trail for zone', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId: mockTenantId,
          entityType: 'ZONE',
          entityId: 'zone-1',
          action: 'CREATE',
          changeSummary: 'Created Zone',
          userId: mockUserId,
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);

      const logs = await ZoneService.getZoneAuditLogs(mockTenantId, 'zone-1');
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('CREATE');
    });
  });
});
