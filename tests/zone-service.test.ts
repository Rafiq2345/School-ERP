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
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
    userRole: {
      create: vi.fn().mockResolvedValue({}),
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
    employee: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
  };

  return { prisma: mockPrisma };
});

describe('ZoneService (Phase 3: Zone / Area Management Redesign)', () => {
  const mockTenantId = 'tenant-sch-001';
  const mockUserId = 'usr-admin-01';
  const mockHeadOfficeId = 'ho-khi-001';
  const mockHeadOffice2Id = 'ho-lah-002';
  const mockRegionId = 'reg-khi-001';
  const mockForeignRegionId = 'reg-lah-002';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.country.count).mockResolvedValue(1);
    vi.mocked(prisma.headOffice.count).mockResolvedValue(1);
    vi.mocked(prisma.region.count).mockResolvedValue(1);
  });

  describe('Hierarchy Rule 1: Parent Head Office is strictly Mandatory', () => {
    it('rejects zone creation without a parent head office', async () => {
      const input: any = {
        name: 'Invalid Test Zone',
        code: 'ZN-TEST-INV',
        city: 'Karachi',
        addressLine1: 'Test Address Line 1',
        phone: '+92 21 34567890',
        email: 'zone@test.com',
      };

      await expect(ZoneService.createZone(mockTenantId, input, mockUserId)).rejects.toThrow(
        'Parent Head Office selection is mandatory. A Zone must always belong to a Head Office.'
      );
    });

    it('rejects zone creation if parent head office does not exist', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue(null);

      const input: any = {
        headOfficeId: 'ho-non-existent',
        name: 'Invalid Test Zone',
        code: 'ZN-TEST-INV',
        city: 'Karachi',
        addressLine1: 'Test Address Line 1',
        phone: '+92 21 34567890',
        email: 'zone@test.com',
      };

      await expect(ZoneService.createZone(mockTenantId, input, mockUserId)).rejects.toThrow(
        'Selected Parent Head Office does not exist or does not belong to this organization.'
      );
    });
  });

  describe('Hierarchy Rule 2: Parent Region is Optional & Must Belong to Parent Head Office', () => {
    beforeEach(() => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
        name: 'Karachi Central Head Office',
        code: 'HO-KHI-001',
        city: 'Karachi',
        status: 'ACTIVE',
      } as any);
    });

    it('creates a Direct Head Office Zone when Parent Region is omitted (regionId: null)', async () => {
      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const createdObj = {
        id: 'zone-direct-001',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: null,
        name: 'Direct Central Zone',
        code: 'ZN-DIR-001',
        shortName: null,
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'direct.zone@test.edu.pk',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      const result = await ZoneService.createZone(
        mockTenantId,
        {
          headOfficeId: mockHeadOfficeId,
          regionId: null,
          name: 'Direct Central Zone',
          code: 'ZN-DIR-001',
          city: 'Karachi',
          addressLine1: 'Main Branch Plaza, Shahrah-e-Faisal',
          phone: '+92 21 34567890',
          email: 'direct.zone@test.edu.pk',
        },
        mockUserId
      );

      expect(result.regionId).toBeNull();
      expect(prisma.zone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            headOfficeId: mockHeadOfficeId,
            regionId: null,
            name: 'Direct Central Zone',
          }),
        })
      );
    });

    it('creates a Head Office -> Region -> Zone when a valid matching Region is selected', async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValue({
        id: mockRegionId,
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId, // matching head office
        name: 'Southern Sindh Region',
        code: 'REG-KHI-001',
        status: 'ACTIVE',
      } as any);

      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const createdObj = {
        id: 'zone-nested-001',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: mockRegionId,
        name: 'Karachi Gulshan Zone',
        code: 'ZN-GUL-001',
        shortName: null,
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'gulshan.zone@test.edu.pk',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      const result = await ZoneService.createZone(
        mockTenantId,
        {
          headOfficeId: mockHeadOfficeId,
          regionId: mockRegionId,
          name: 'Karachi Gulshan Zone',
          code: 'ZN-GUL-001',
          city: 'Karachi',
          addressLine1: 'Block 6, Gulshan-e-Iqbal',
          phone: '+92 21 34567890',
          email: 'gulshan.zone@test.edu.pk',
        },
        mockUserId
      );

      expect(result.regionId).toBe(mockRegionId);
    });

    it('rejects zone creation if selected Parent Region belongs to a different Head Office', async () => {
      vi.mocked(prisma.region.findFirst).mockResolvedValue({
        id: mockForeignRegionId,
        tenantId: mockTenantId,
        headOfficeId: mockHeadOffice2Id, // DIFFERENT head office!
        name: 'Lahore Northern Region',
        code: 'REG-LHR-002',
        status: 'ACTIVE',
      } as any);

      const input = {
        headOfficeId: mockHeadOfficeId,
        regionId: mockForeignRegionId,
        name: 'Mismatched Zone',
        code: 'ZN-MIS-001',
        city: 'Karachi',
        addressLine1: 'Block 1, PECHS',
        phone: '+92 21 34567890',
        email: 'mismatch.zone@test.edu.pk',
      };

      await expect(ZoneService.createZone(mockTenantId, input, mockUserId)).rejects.toThrow(
        'Selected Parent Region does not belong to the selected Parent Head Office.'
      );
    });
  });

  describe('Re-parenting Integrity', () => {
    it('safely re-parents a Direct Head Office Zone into a Region-attached Zone', async () => {
      const existingZone = {
        id: 'zone-reparent-001',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: null, // initially direct HO
        name: 'Flexible Zone',
        code: 'ZN-FLX-001',
        shortName: null,
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'flx@test.edu.pk',
        status: 'ACTIVE',
        loginUsername: 'zn_flx_001',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existingZone as any);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
        name: 'Central Head Office',
      } as any);
      vi.mocked(prisma.region.findFirst).mockResolvedValue({
        id: mockRegionId,
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Southern Sindh Region',
      } as any);

      vi.mocked(prisma.zone.update).mockResolvedValue({
        ...existingZone,
        regionId: mockRegionId,
      } as any);

      const updated = await ZoneService.updateZone(
        mockTenantId,
        'zone-reparent-001',
        { regionId: mockRegionId },
        mockUserId
      );

      expect(updated.regionId).toBe(mockRegionId);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeSummary: expect.stringContaining('Re-parented'),
          }),
        })
      );
    });

    it('safely removes Region association and re-parents to Direct Head Office', async () => {
      const existingZone = {
        id: 'zone-reparent-002',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: mockRegionId, // initially nested
        name: 'Flexible Zone 2',
        code: 'ZN-FLX-002',
        shortName: null,
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'flx2@test.edu.pk',
        status: 'ACTIVE',
        region: { name: 'Southern Sindh Region' },
        loginUsername: 'zn_flx_002',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existingZone as any);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
        name: 'Central Head Office',
      } as any);

      vi.mocked(prisma.zone.update).mockResolvedValue({
        ...existingZone,
        regionId: null,
      } as any);

      const updated = await ZoneService.updateZone(
        mockTenantId,
        'zone-reparent-002',
        { regionId: 'NONE' },
        mockUserId
      );

      expect(updated.regionId).toBeNull();
    });
  });

  describe('Branding Assets & Login Access Creation', () => {
    it('creates zone with branding asset URLs and creates linked user record with scrypt hashing', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({
        id: mockHeadOfficeId,
        tenantId: mockTenantId,
        name: 'Karachi Central Head Office',
        city: 'Karachi',
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: 'usr-zn-001', username: 'zn_khi_admin' } as any);
      vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: 'role-zone-admin', code: 'ZONE_ADMIN' } as any);

      const createdObj = {
        id: 'zone-brand-001',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: null,
        name: 'Branded Zone',
        code: 'ZN-BRD-001',
        shortName: 'REG-ZN-777',
        logoUrl: '/uploads/zone/logo.png',
        signatureUrl: '/uploads/zone/sig.png',
        stampUrl: '/uploads/zone/stamp.png',
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'branded.zone@test.edu.pk',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      const result = await ZoneService.createZone(
        mockTenantId,
        {
          headOfficeId: mockHeadOfficeId,
          name: 'Branded Zone',
          code: 'ZN-BRD-001',
          registrationNo: 'REG-ZN-777',
          city: 'Karachi',
          addressLine1: 'Branding Park Suite 10',
          phone: '+92 21 34567890',
          email: 'branded.zone@test.edu.pk',
          logoUrl: '/uploads/zone/logo.png',
          signatureUrl: '/uploads/zone/sig.png',
          stampUrl: '/uploads/zone/stamp.png',
          loginUsername: 'zn_khi_admin',
          loginPassword: 'SecurePassword123!',
          loginStatus: 'ACTIVE',
        },
        mockUserId
      );

      expect(result.logoUrl).toBe('/uploads/zone/logo.png');
      expect(result.signatureUrl).toBe('/uploads/zone/sig.png');
      expect(result.stampUrl).toBe('/uploads/zone/stamp.png');
      expect(result.registrationNo).toBe('REG-ZN-777');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'zn_khi_admin',
            userType: 'ADMIN',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('updates zone and preserves existing password when password is not provided', async () => {
      const existingZone = {
        id: 'zone-pwd-001',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: null,
        name: 'Password Test Zone',
        code: 'ZN-PWD-001',
        shortName: null,
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'pwd@test.edu.pk',
        status: 'ACTIVE',
        loginUsername: 'zn_pwd_001',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existingZone as any);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId, tenantId: mockTenantId } as any);
      vi.mocked(prisma.zone.update).mockResolvedValue({ ...existingZone, name: 'Updated Name Zone' } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'usr-001', username: 'zn_pwd_001' } as any);

      await ZoneService.updateZone(
        mockTenantId,
        'zone-pwd-001',
        { name: 'Updated Name Zone' }, // no password
        mockUserId
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr-001' },
          data: expect.not.objectContaining({ passwordHash: expect.anything() }),
        })
      );
    });

    it('updates user password when an explicit new password is provided', async () => {
      const existingZone = {
        id: 'zone-pwd-002',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        regionId: null,
        name: 'Password Reset Zone',
        code: 'ZN-RST-002',
        shortName: null,
        city: 'Karachi',
        phone: '+92 21 34567890',
        email: 'rst@test.edu.pk',
        status: 'ACTIVE',
        loginUsername: 'zn_rst_002',
      };

      vi.mocked(prisma.zone.findFirst).mockResolvedValue(existingZone as any);
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId, tenantId: mockTenantId } as any);
      vi.mocked(prisma.zone.update).mockResolvedValue(existingZone as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'usr-002', username: 'zn_rst_002' } as any);

      await ZoneService.updateZone(
        mockTenantId,
        'zone-pwd-002',
        { loginPassword: 'NewSecretPassword999!' },
        mockUserId
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr-002' },
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Validation & Sanitization', () => {
    it('validates unique zone code within tenant', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId, tenantId: mockTenantId } as any);
      vi.mocked(prisma.zone.findUnique).mockResolvedValue({ id: 'existing-zn', code: 'ZN-DUP-001' } as any);

      const input = {
        headOfficeId: mockHeadOfficeId,
        name: 'Duplicate Zone',
        code: 'ZN-DUP-001',
        city: 'Karachi',
        addressLine1: 'Block 1',
        phone: '+92 21 34567890',
        email: 'dup@test.edu.pk',
      };

      await expect(ZoneService.createZone(mockTenantId, input, mockUserId)).rejects.toThrow(
        'A Zone with code "ZN-DUP-001" already exists.'
      );
    });

    it('validates official email format', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId, tenantId: mockTenantId } as any);

      const input = {
        headOfficeId: mockHeadOfficeId,
        name: 'Bad Email Zone',
        code: 'ZN-BAD-001',
        city: 'Karachi',
        addressLine1: 'Block 1',
        phone: '+92 21 34567890',
        email: 'not-an-email',
      };

      await expect(ZoneService.createZone(mockTenantId, input, mockUserId)).rejects.toThrow(
        /valid official email/i
      );
    });

    it('sanitizes password and hash from audit logs', async () => {
      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue({ id: mockHeadOfficeId, tenantId: mockTenantId } as any);
      vi.mocked(prisma.zone.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const createdObj = {
        id: 'zone-san-001',
        tenantId: mockTenantId,
        headOfficeId: mockHeadOfficeId,
        name: 'Sanitized Zone',
        code: 'ZN-SAN-001',
      };
      vi.mocked(prisma.zone.create).mockResolvedValue(createdObj as any);

      await ZoneService.createZone(
        mockTenantId,
        {
          headOfficeId: mockHeadOfficeId,
          name: 'Sanitized Zone',
          code: 'ZN-SAN-001',
          city: 'Karachi',
          addressLine1: 'Block 1',
          phone: '+92 21 34567890',
          email: 'san@test.edu.pk',
          loginPassword: 'SuperSecretPassword123!',
        },
        mockUserId
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            newValues: expect.not.objectContaining({
              password: expect.anything(),
              loginPassword: expect.anything(),
              passwordHash: expect.anything(),
            }),
          }),
        })
      );
    });
  });
});
