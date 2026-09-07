import { prisma } from '@/lib/db/prisma';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { RegionService } from '@/lib/services/region-service';
import { ZoneService } from '@/lib/services/zone-service';
import { hashPassword } from '@/lib/auth/password';

export interface BranchInput {
  headOfficeId?: string | null;
  regionId?: string | null;
  zoneId?: string | null;
  name: string;
  code: string;
  shortName?: string | null;
  schoolType?: string | null;
  openingDate?: string | Date | null;
  registrationNo?: string | null;
  boardAffiliation?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timezone?: string;
  currency?: string;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  tagline?: string | null;
  principalEmployeeId?: string | null;
  adminContactEmployeeId?: string | null;
  principalName?: string | null;
  principalDesignation?: string | null;
  adminContact?: string | null;
  adminContactDesignation?: string | null;
  genderModel?: string | null;
  shiftModel?: string | null;
  capacity?: number | null;
  academicPrograms?: any;
  offeredClassCategoryIds?: any;
  offeredClassIds?: any;
  academicScopeNotes?: string | null;
  feeCollectionAccount?: string | null;
  receiptPrefix?: string | null;
  voucherPrefix?: string | null;
  // Login Access fields
  loginUsername?: string | null;
  loginPassword?: string | null;
  loginStatus?: 'ACTIVE' | 'INACTIVE';
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks?: string | null;
}

export class BranchService {
  private static async logAudit(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    changeSummary: string;
  }) {
    if (!params.userId) return;
    try {
      if (prisma.auditLog?.create) {
        // Sanitize out any sensitive password fields
        const sanitize = (obj: any) => {
          if (!obj || typeof obj !== 'object') return obj;
          const copy = { ...obj };
          delete copy.password;
          delete copy.loginPassword;
          delete copy.confirmPassword;
          delete copy.passwordHash;
          return copy;
        };

        await prisma.auditLog.create({
          data: {
            tenantId: params.tenantId,
            userId: params.userId,
            module: 'SETTINGS',
            entityType: 'BRANCH',
            entityId: params.entityId,
            action: params.action,
            oldValues: params.oldValues ? sanitize(params.oldValues) : undefined,
            newValues: params.newValues ? sanitize(params.newValues) : undefined,
            changeSummary: params.changeSummary,
          },
        });
      }
    } catch {
      // Non-blocking audit logging
    }
  }

  /**
   * Check single-school vs multi-branch hierarchy mode
   */
  public static async getHierarchyMode(tenantId: string) {
    const [headOfficeCount, branchCount, defaultBranch, primaryHO] = await Promise.all([
      prisma.headOffice.count({ where: { tenantId } }),
      prisma.branch.count({ where: { tenantId } }),
      prisma.branch.findFirst({ where: { tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } }),
      prisma.headOffice.findFirst({ where: { tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } }),
    ]);

    const isMultiBranch = headOfficeCount > 0;
    return {
      mode: isMultiBranch ? ('MULTI_BRANCH' as const) : ('SINGLE_SCHOOL' as const),
      headOfficeCount,
      branchCount,
      defaultBranch,
      primaryHO,
      canAddMoreBranches: true,
    };
  }

  /**
   * Safe Upgrade to Multi-Branch structure without data loss
   */
  public static async upgradeToMultiBranch(
    tenantId: string,
    options: { headOfficeName?: string; addressLine1?: string; city?: string } = {},
    userId?: string
  ) {
    const currentMode = await this.getHierarchyMode(tenantId);
    if (currentMode.headOfficeCount > 0 && currentMode.primaryHO) {
      return {
        alreadyUpgraded: true,
        headOffice: currentMode.primaryHO,
        message: 'Organization is already configured for multi-branch operations.',
      };
    }

    // Ensure default reference data
    await GlobalReferenceService.ensureReferenceDataSeeded();

    // Look up existing school profile
    const schoolProfile = await prisma.schoolProfile.findUnique({ where: { tenantId } });

    const hoName = options.headOfficeName?.trim()
      ? options.headOfficeName.trim()
      : schoolProfile?.nameEn
      ? `${schoolProfile.nameEn} — Central Head Office`
      : 'Central Executive Head Office';

    const hoAddress = options.addressLine1?.trim() || schoolProfile?.addressEn || 'Central Executive Secretariat';
    const hoCity = options.city?.trim() || 'Karachi';

    // Create Head Office
    const createdHO = await HeadOfficeService.createHeadOffice(
      tenantId,
      {
        name: hoName,
        code: 'HO-MAIN',
        addressLine1: hoAddress,
        city: hoCity,
        directorName: 'Executive Director Desk',
        adminContact: 'Central Administration Secretariat',
      },
      userId
    );

    // Link any existing branches that were not linked to a HO
    await prisma.branch.updateMany({
      where: { tenantId, headOfficeId: null },
      data: { headOfficeId: createdHO.id },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPGRADE_MULTI_BRANCH',
      entityId: createdHO.id,
      newValues: createdHO,
      changeSummary: `Upgraded tenant to multi-branch structure with Head Office: "${createdHO.name}"`,
    });

    return {
      alreadyUpgraded: false,
      headOffice: createdHO,
      message: 'Successfully upgraded to multi-branch hierarchy. You can now add multiple campuses.',
    };
  }

  /**
   * Seed a default Branch for the tenant if none currently exist
   */
  public static async ensureDefaultBranch(tenantId: string, userId?: string) {
    // Ensure primary Head Office exists
    await HeadOfficeService.ensureDefaultHeadOffice(tenantId, userId);

    const count = await prisma.branch.count({
      where: { tenantId },
    });

    if (count === 0) {
      const primaryHO = await prisma.headOffice.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });

      const primaryRegion = primaryHO
        ? await prisma.region.findFirst({
            where: { tenantId, headOfficeId: primaryHO.id, status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          })
        : null;

      const primaryZone = primaryHO
        ? await prisma.zone.findFirst({
            where: { tenantId, headOfficeId: primaryHO.id, status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          })
        : null;

      // Reference IDs
      const pkCountry = await prisma.country.findUnique({ where: { isoCode: 'PK' } });
      const sindhState = pkCountry
        ? await prisma.stateProvince.findFirst({ where: { countryId: pkCountry.id, code: 'SD' } })
        : null;
      const karachiCity = sindhState
        ? await prisma.city.findFirst({ where: { stateId: sindhState.id, code: 'KHI' } })
        : null;

      const defaultBranch = await prisma.branch.create({
        data: {
          tenant: { connect: { id: tenantId } },
          headOffice: primaryHO ? { connect: { id: primaryHO.id } } : undefined,
          region: primaryRegion ? { connect: { id: primaryRegion.id } } : undefined,
          zone: primaryZone ? { connect: { id: primaryZone.id } } : undefined,
          countryRef: pkCountry ? { connect: { id: pkCountry.id } } : undefined,
          stateRef: sindhState ? { connect: { id: sindhState.id } } : undefined,
          cityRef: karachiCity ? { connect: { id: karachiCity.id } } : undefined,
          name: 'Greenwood High School (Main Campus)',
          code: 'SCH-KHI-001',
          shortName: 'GHS-MAIN',
          schoolType: 'Main Campus',
          openingDate: new Date('2015-08-14'),
          registrationNo: 'REG-EDU-2015/0984',
          boardAffiliation: 'Federal Board (FBISE)',
          addressLine1: 'Plot ST-14, Block 6, Gulshan-e-Iqbal',
          addressLine2: 'University Road Campus Complex',
          city: karachiCity?.name || primaryHO?.city || 'Karachi',
          state: sindhState?.name || primaryHO?.state || 'Sindh',
          country: pkCountry?.name || primaryHO?.country || 'Pakistan',
          postalCode: '75300',
          timezone: 'Asia/Karachi',
          currency: 'PKR',
          phone: '+92 21 34980001',
          altPhone: '+92 21 34980002',
          email: 'campus.main@greenwood.edu.pk',
          website: 'https://greenwood.edu.pk/campuses/main',
          logoUrl: null,
          tagline: 'Inspiring Excellence, Character & Knowledge',
          principalName: 'Prof. S. M. Farooqui',
          principalDesignation: 'Campus Principal',
          adminContact: 'Zubair Qureshi',
          adminContactDesignation: 'Campus Administrator',
          genderModel: 'CO_ED',
          shiftModel: 'MORNING',
          capacity: 1200,
          academicPrograms: ['MATRIC', 'CAMBRIDGE', 'FBISE'],
          academicScopeNotes: 'Playgroup to Grade 12 (Matriculation, Intermediate & O/A Levels)',
          feeCollectionAccount: 'HBL A/C # 0142-7901234503',
          receiptPrefix: 'REC',
          voucherPrefix: 'VCH',
          status: 'ACTIVE',
          remarks: 'Flagship central urban campus with complete science & IT laboratories.',
        } as any,
      });

      await this.logAudit({
        tenantId,
        userId: userId || 'system',
        action: 'CREATE',
        entityId: defaultBranch.id,
        newValues: defaultBranch,
        changeSummary: `Initialized default flagship Branch: ${defaultBranch.name} (${defaultBranch.code})`,
      });

      return defaultBranch;
    }
    return null;
  }

  /**
   * System-controlled Branch Code Generation (e.g. SCH-KHI-001 or BR-001)
   */
  public static async generateBranchCode(tenantId: string, cityCodeOrPrefix?: string): Promise<string> {
    const raw = cityCodeOrPrefix ? cityCodeOrPrefix.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : '';
    const prefix = raw || 'GEN';

    const existing = await prisma.branch.findMany({
      where: {
        tenantId,
        code: { startsWith: `SCH-${prefix}-` },
      },
      select: { code: true },
    });

    const nextSeq = existing.length + 1;
    const padded = String(nextSeq).padStart(3, '0');
    return `SCH-${prefix}-${padded}`;
  }

  /**
   * Get all Branches with filtering, searching, and aggregate metrics
   */
  public static async getBranches(
    tenantId: string,
    options: {
      search?: string;
      status?: string;
      structureMode?: 'ALL' | 'INDEPENDENT' | 'NETWORK';
      headOfficeId?: string;
      regionId?: string;
      zoneId?: string;
      schoolType?: string;
      city?: string;
    } = {}
  ) {
    await this.ensureDefaultBranch(tenantId);

    const where: any = { tenantId };

    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
    }

    if (options.structureMode === 'INDEPENDENT') {
      where.headOfficeId = null;
    } else if (options.structureMode === 'NETWORK') {
      where.headOfficeId = { not: null };
    }

    if (options.headOfficeId && options.headOfficeId !== 'ALL') {
      if (options.headOfficeId === 'INDEPENDENT' || options.headOfficeId === 'NONE') {
        where.headOfficeId = null;
      } else {
        where.headOfficeId = options.headOfficeId;
      }
    }

    if (options.regionId) {
      if (options.regionId === 'NONE') {
        where.regionId = null;
      } else if (options.regionId !== 'ALL') {
        where.regionId = options.regionId;
      }
    }

    if (options.zoneId) {
      if (options.zoneId === 'NONE') {
        where.zoneId = null;
      } else if (options.zoneId !== 'ALL') {
        where.zoneId = options.zoneId;
      }
    }

    if (options.schoolType && options.schoolType !== 'ALL') {
      where.schoolType = options.schoolType;
    }

    if (options.city && options.city !== 'ALL') {
      where.city = { equals: options.city, mode: 'insensitive' };
    }

    if (options.search) {
      const q = options.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { shortName: { contains: q, mode: 'insensitive' } },
        { schoolType: { contains: q, mode: 'insensitive' } },
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { boardAffiliation: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
        { principalName: { contains: q, mode: 'insensitive' } },
        { adminContact: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { addressLine1: { contains: q, mode: 'insensitive' } },
        { academicScopeNotes: { contains: q, mode: 'insensitive' } },
        { headOffice: { name: { contains: q, mode: 'insensitive' } } },
        { region: { name: { contains: q, mode: 'insensitive' } } },
        { zone: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, allRecords, allHeadOffices, allRegions, allZones] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: {
          headOffice: { select: { id: true, name: true, code: true, city: true, status: true } },
          region: { select: { id: true, name: true, code: true, shortName: true, city: true, status: true, headOfficeId: true } },
          zone: { select: { id: true, name: true, code: true, shortName: true, city: true, status: true, headOfficeId: true, regionId: true } },
          countryRef: { select: { id: true, name: true, isoCode: true, phoneCallingCode: true, currencyCode: true } },
          stateRef: { select: { id: true, name: true, code: true, type: true } },
          cityRef: { select: { id: true, name: true, code: true } },
          principal: {
            select: {
              id: true,
              employeeNo: true,
              firstNameEn: true,
              lastNameEn: true,
              department: { select: { name: true } },
              designation: { select: { name: true } },
            },
          },
          adminContactPerson: {
            select: {
              id: true,
              employeeNo: true,
              firstNameEn: true,
              lastNameEn: true,
              department: { select: { name: true } },
              designation: { select: { name: true } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.branch.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          city: true,
          schoolType: true,
          headOfficeId: true,
          regionId: true,
          zoneId: true,
          capacity: true,
        },
      }),
      prisma.headOffice.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true, city: true, status: true },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
      prisma.region.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true, shortName: true, city: true, status: true, headOfficeId: true },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
      prisma.zone.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true, shortName: true, city: true, status: true, headOfficeId: true, regionId: true },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
    ]);

    // Fetch linked user accounts for branches to enrich login access info
    let usersByUsername = new Map<string, { username: string; status: string }>();
    if (prisma.user?.findMany) {
      try {
        const usernames = items.map((b) => b.code.toLowerCase().replace(/-/g, '_'));
        const users = await prisma.user.findMany({
          where: {
            tenantId,
            username: { in: usernames },
          },
          select: { username: true, status: true },
        });
        users.forEach((u) => usersByUsername.set(u.username, u));
      } catch {
        // Non-blocking fallback
      }
    }

    const enrichedItems = items.map((branch) => {
      const defaultUsername = branch.code.toLowerCase().replace(/-/g, '_');
      const user = usersByUsername.get(defaultUsername);
      return {
        ...branch,
        loginUsername: user?.username || defaultUsername,
        loginStatus: (user?.status as 'ACTIVE' | 'INACTIVE') || (branch.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
      };
    });

    const activeCount = allRecords.filter((r) => r.status === 'ACTIVE').length;
    const inactiveCount = allRecords.filter((r) => r.status === 'INACTIVE').length;
    const archivedCount = allRecords.filter((r) => r.status === 'ARCHIVED').length;
    const independentCount = allRecords.filter((r) => !r.headOfficeId).length;
    const networkCount = allRecords.filter((r) => !!r.headOfficeId).length;
    const directHoCount = allRecords.filter((r) => !!r.headOfficeId && !r.regionId && !r.zoneId).length;
    const noZoneCount = allRecords.filter((r) => !r.zoneId).length;
    const totalCapacity = allRecords.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const uniqueCities = Array.from(new Set(allRecords.map((r) => r.city).filter(Boolean))) as string[];
    const uniqueSchoolTypes = Array.from(new Set(allRecords.map((r) => r.schoolType).filter(Boolean))) as string[];

    return {
      items: enrichedItems,
      stats: {
        total: allRecords.length,
        active: activeCount,
        inactive: inactiveCount,
        archived: archivedCount,
        independentCount,
        networkCount,
        directHoCount,
        noZoneCount,
        totalCapacity,
        citiesCount: uniqueCities.length,
        availableCities: uniqueCities,
        availableSchoolTypes: uniqueSchoolTypes,
        availableHeadOffices: allHeadOffices,
        availableRegions: allRegions,
        availableZones: allZones,
      },
    };
  }

  /**
   * Get single Branch by ID with all relations
   */
  public static async getBranchById(tenantId: string, id: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, tenantId },
      include: {
        headOffice: true,
        region: true,
        zone: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        principal: {
          include: {
            department: true,
            designation: true,
          },
        },
        adminContactPerson: {
          include: {
            department: true,
            designation: true,
          },
        },
      },
    });

    if (!branch) {
      throw new Error(`Branch not found with ID: ${id}`);
    }

    // Enrich login account details if available
    let loginUsername: string | null = null;
    let loginStatus: string | null = null;
    try {
      if (prisma.user?.findFirst) {
        const user = await prisma.user.findFirst({
          where: {
            tenantId,
            username: branch.code.toLowerCase().replace(/-/g, '_'),
          },
          select: { username: true, status: true },
        });
        if (user) {
          loginUsername = user.username;
          loginStatus = user.status;
        }
      }
    } catch {
      // Non-blocking
    }

    return {
      ...branch,
      loginUsername: loginUsername || branch.code.toLowerCase().replace(/-/g, '_'),
      loginStatus: (loginStatus as 'ACTIVE' | 'INACTIVE') || (branch.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
    };
  }

  /**
   * Validate and resolve reference relations & formatting for Branch (Supporting Independent + Hierarchical)
   */
  private static async resolveAndValidateReferences(
    tenantId: string,
    input: BranchInput
  ) {
    let headOffice: any = null;
    let region: any = null;
    let zone: any = null;

    // 1. Parent Head Office Validation (Optional: If provided, must exist; If omitted/null, it's an Independent School)
    if (input.headOfficeId && input.headOfficeId.trim() !== '' && input.headOfficeId !== 'INDEPENDENT' && input.headOfficeId !== 'NONE') {
      headOffice = await prisma.headOffice.findFirst({
        where: { id: input.headOfficeId.trim(), tenantId },
      });

      if (!headOffice) {
        throw new Error('Selected Parent Head Office does not exist or does not belong to this organization.');
      }

      // 2. Parent Region Validation (Optional for Branch under HO)
      if (input.regionId && input.regionId.trim() !== '' && input.regionId !== 'NONE' && input.regionId !== 'DIRECT') {
        region = await prisma.region.findFirst({
          where: { id: input.regionId.trim(), tenantId },
        });

        if (!region) {
          throw new Error('Selected Parent Region does not exist or does not belong to this organization.');
        }

        if (region.headOfficeId !== input.headOfficeId.trim()) {
          throw new Error('Selected Parent Region does not belong to the selected Parent Head Office.');
        }
      }

      // 3. Parent Zone Validation (Optional for Branch under HO)
      if (input.zoneId && input.zoneId.trim() !== '' && input.zoneId !== 'NONE' && input.zoneId !== 'DIRECT') {
        zone = await prisma.zone.findFirst({
          where: { id: input.zoneId.trim(), tenantId },
        });

        if (!zone) {
          throw new Error('Selected Parent Zone does not exist or does not belong to this organization.');
        }

        if (zone.headOfficeId !== input.headOfficeId.trim()) {
          throw new Error('Selected Parent Zone does not belong to the selected Parent Head Office.');
        }

        if (zone.regionId && input.regionId && zone.regionId !== input.regionId.trim()) {
          throw new Error('Selected Zone belongs to a different Region than the selected Branch Region.');
        }

        if (zone.regionId && (!input.regionId || input.regionId.trim() === '')) {
          region = await prisma.region.findFirst({
            where: { id: zone.regionId, tenantId },
          });
        }
      }
    } else {
      // Independent School: regionId and zoneId must be null
      if (input.regionId && input.regionId.trim() !== '' && input.regionId !== 'NONE' && input.regionId !== 'DIRECT') {
        throw new Error('An Independent School cannot be assigned a Region without a Head Office.');
      }
      if (input.zoneId && input.zoneId.trim() !== '' && input.zoneId !== 'NONE' && input.zoneId !== 'DIRECT') {
        throw new Error('An Independent School cannot be assigned a Zone without a Head Office.');
      }
    }

    // 4. Geographic Location (Supports Master reference OR Manual text)
    let resolvedCountryName = input.country?.trim() || zone?.country || region?.country || headOffice?.country || 'Pakistan';
    let resolvedStateName = input.state?.trim() || zone?.state || region?.state || headOffice?.state || null;
    let resolvedCityName = input.city?.trim() || zone?.city || region?.city || headOffice?.city || '';
    let callingCode = '+92';

    if (input.countryId && input.countryId.trim() !== '') {
      const country = await prisma.country.findUnique({ where: { id: input.countryId } });
      if (country) {
        resolvedCountryName = country.name;
        callingCode = country.phoneCallingCode;

        if (input.stateId && input.stateId.trim() !== '') {
          const state = await prisma.stateProvince.findUnique({ where: { id: input.stateId } });
          if (state && state.countryId === input.countryId) {
            resolvedStateName = state.name;

            if (input.cityId && input.cityId.trim() !== '') {
              const city = await prisma.city.findUnique({ where: { id: input.cityId } });
              if (city && city.stateId === input.stateId) {
                resolvedCityName = city.name;
              }
            }
          }
        }
      }
    }

    if (!resolvedCityName && input.city) {
      resolvedCityName = input.city.trim();
    }

    // 5. Leadership & Staff (Supports Direct Name/Designation Entry OR HR Linking)
    let resolvedPrincipalName = input.principalName ? input.principalName.trim() : null;
    let resolvedPrincipalDesignation = input.principalDesignation ? input.principalDesignation.trim() : 'Principal';

    if (input.principalEmployeeId && input.principalEmployeeId.trim() !== '') {
      const principalEmp = await prisma.employee.findFirst({
        where: { id: input.principalEmployeeId, tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });
      if (principalEmp) {
        resolvedPrincipalName = `${principalEmp.firstNameEn} ${principalEmp.lastNameEn || ''}`.trim();
        if (principalEmp.designation?.name) {
          resolvedPrincipalDesignation = principalEmp.designation.name;
        }
      }
    }

    let resolvedAdminContact = input.adminContact ? input.adminContact.trim() : null;
    let resolvedAdminContactDesignation = input.adminContactDesignation ? input.adminContactDesignation.trim() : 'Campus Administrator';

    if (input.adminContactEmployeeId && input.adminContactEmployeeId.trim() !== '') {
      const adminEmp = await prisma.employee.findFirst({
        where: { id: input.adminContactEmployeeId, tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });
      if (adminEmp) {
        resolvedAdminContact = `${adminEmp.firstNameEn} ${adminEmp.lastNameEn || ''}`.trim();
        if (adminEmp.designation?.name) {
          resolvedAdminContactDesignation = adminEmp.designation.name;
        }
      }
    }

    // 6. Phone, Email & Website Normalization
    const normalizedPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.phone, callingCode);
    const normalizedAltPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.altPhone, callingCode);
    const emailRes = GlobalReferenceService.validateEmail(input.email);
    const websiteRes = GlobalReferenceService.validateWebsite(input.website);

    return {
      headOffice,
      region,
      zone,
      country: resolvedCountryName,
      state: resolvedStateName,
      city: resolvedCityName,
      principalName: resolvedPrincipalName,
      principalDesignation: resolvedPrincipalDesignation,
      adminContact: resolvedAdminContact,
      adminContactDesignation: resolvedAdminContactDesignation,
      phone: normalizedPhoneRes.normalized,
      altPhone: normalizedAltPhoneRes.normalized,
      email: input.email ? input.email.trim() : null,
      website: websiteRes.normalizedUrl,
    };
  }

  /**
   * Create a new Branch (Independent or Hierarchical) with Login Access
   */
  public static async createBranch(tenantId: string, input: BranchInput, userId?: string) {
    if (!input.name || !input.name.trim()) {
      throw new Error('Branch / School Name is required.');
    }
    if (!input.code || !input.code.trim()) {
      throw new Error('Branch Code is required.');
    }
    if (!input.addressLine1 || !input.addressLine1.trim()) {
      throw new Error('Address Line 1 is required.');
    }

    const resolved = await this.resolveAndValidateReferences(tenantId, input);
    const normalizedCode = input.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = await prisma.branch.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new Error(`A Branch with code "${normalizedCode}" already exists.`);
    }

    // 1. Handle Login Access Credentials Validation
    const targetUsername = (input.loginUsername || normalizedCode.toLowerCase().replace(/-/g, '_')).trim().toLowerCase();
    if (targetUsername.length < 3) {
      throw new Error('Login ID / Username must be at least 3 characters.');
    }

    // Check username uniqueness if User table is available
    if (prisma.user?.findFirst) {
      const existingUser = await prisma.user.findFirst({
        where: { tenantId, username: targetUsername },
      });
      if (existingUser) {
        throw new Error(`Username "${targetUsername}" is already in use by another account.`);
      }
    }

    let passwordHash: string | null = null;
    if (input.loginPassword && input.loginPassword.trim()) {
      if (input.loginPassword.trim().length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      passwordHash = await hashPassword(input.loginPassword.trim());
    }

    let parsedOpeningDate: Date | null = null;
    if (input.openingDate) {
      parsedOpeningDate = new Date(input.openingDate);
      if (isNaN(parsedOpeningDate.getTime())) {
        parsedOpeningDate = null;
      }
    }

    const effectiveHeadOfficeId = resolved.headOffice?.id || (input.headOfficeId && input.headOfficeId.trim() !== '' && input.headOfficeId !== 'INDEPENDENT' && input.headOfficeId !== 'NONE' ? input.headOfficeId.trim() : null);

    const effectiveRegionId = effectiveHeadOfficeId && resolved.region?.id
      ? resolved.region.id
      : effectiveHeadOfficeId && input.regionId && input.regionId.trim() !== '' && input.regionId !== 'NONE' && input.regionId !== 'DIRECT'
      ? input.regionId.trim()
      : null;

    const effectiveZoneId = effectiveHeadOfficeId && resolved.zone?.id
      ? resolved.zone.id
      : effectiveHeadOfficeId && input.zoneId && input.zoneId.trim() !== '' && input.zoneId !== 'NONE' && input.zoneId !== 'DIRECT'
      ? input.zoneId.trim()
      : null;

    // 2. Create Branch Record using relation connect syntax for guaranteed tenant ownership
    const created = await prisma.branch.create({
      data: {
        tenant: { connect: { id: tenantId } },
        headOffice: effectiveHeadOfficeId ? { connect: { id: effectiveHeadOfficeId } } : undefined,
        region: effectiveRegionId ? { connect: { id: effectiveRegionId } } : undefined,
        zone: effectiveZoneId ? { connect: { id: effectiveZoneId } } : undefined,
        countryRef: input.countryId ? { connect: { id: input.countryId } } : undefined,
        stateRef: input.stateId ? { connect: { id: input.stateId } } : undefined,
        cityRef: input.cityId ? { connect: { id: input.cityId } } : undefined,
        principal: input.principalEmployeeId ? { connect: { id: input.principalEmployeeId } } : undefined,
        adminContactPerson: input.adminContactEmployeeId ? { connect: { id: input.adminContactEmployeeId } } : undefined,
        name: input.name.trim(),
        code: normalizedCode,
        shortName: input.shortName ? input.shortName.trim().toUpperCase() : null,
        schoolType: input.schoolType?.trim() || 'Branch Campus',
        openingDate: parsedOpeningDate,
        registrationNo: input.registrationNo ? input.registrationNo.trim() : null,
        boardAffiliation: input.boardAffiliation ? input.boardAffiliation.trim() : null,
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2 ? input.addressLine2.trim() : null,
        city: resolved.city || 'Karachi',
        state: resolved.state || null,
        country: resolved.country || 'Pakistan',
        postalCode: input.postalCode ? input.postalCode.trim() : null,
        timezone: input.timezone || 'Asia/Karachi',
        currency: input.currency || 'PKR',
        phone: resolved.phone,
        altPhone: resolved.altPhone,
        email: resolved.email,
        website: resolved.website,
        logoUrl: input.logoUrl ? input.logoUrl.trim() : null,
        signatureUrl: input.signatureUrl ? input.signatureUrl.trim() : null,
        stampUrl: input.stampUrl ? input.stampUrl.trim() : null,
        tagline: input.tagline ? input.tagline.trim() : null,
        principalName: resolved.principalName,
        principalDesignation: resolved.principalDesignation,
        adminContact: resolved.adminContact,
        adminContactDesignation: resolved.adminContactDesignation,
        genderModel: input.genderModel || 'CO_ED',
        shiftModel: input.shiftModel || 'MORNING',
        capacity: input.capacity ? Number(input.capacity) : null,
        academicPrograms: input.academicPrograms || [],
        offeredClassCategoryIds: input.offeredClassCategoryIds || [],
        offeredClassIds: input.offeredClassIds || [],
        academicScopeNotes: input.academicScopeNotes ? input.academicScopeNotes.trim() : null,
        feeCollectionAccount: input.feeCollectionAccount ? input.feeCollectionAccount.trim() : null,
        receiptPrefix: input.receiptPrefix ? input.receiptPrefix.trim().toUpperCase() : 'REC',
        voucherPrefix: input.voucherPrefix ? input.voucherPrefix.trim().toUpperCase() : 'VCH',
        status: input.status || input.loginStatus || 'ACTIVE',
        remarks: input.remarks ? input.remarks.trim() : null,
      } as any,
      include: {
        headOffice: true,
        region: true,
        zone: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        principal: true,
        adminContactPerson: true,
      },
    });

    // 3. Create Login Account in User table if password provided and model available
    if (passwordHash && prisma.user?.create) {
      try {
        const newUser = await prisma.user.create({
          data: {
            tenantId,
            username: targetUsername,
            email: resolved.email || `${targetUsername}@school.internal`,
            phone: resolved.phone || undefined,
            passwordHash,
            userType: 'ADMIN',
            status: input.loginStatus || 'ACTIVE',
          },
        });

        let branchRole = await prisma.role.findFirst({
          where: { tenantId, code: 'BRANCH_ADMIN' },
        });

        if (!branchRole) {
          try {
            branchRole = await prisma.role.create({
              data: {
                tenantId,
                name: 'Branch Administrator',
                code: 'BRANCH_ADMIN',
                description: 'Administrative access for Branch / Campus management',
              },
            });
          } catch {
            // Non-blocking if role already exists with different code
          }
        }

        if (branchRole) {
          try {
            await prisma.userRole.create({
              data: {
                tenantId,
                userId: newUser.id,
                roleId: branchRole.id,
              },
            });
          } catch {
            // Non-blocking
          }
        }
      } catch {
        // Non-blocking if User record creation encounters minor conflict
      }
    }

    const hierarchyPath = effectiveHeadOfficeId
      ? [
          `Head Office: ${resolved.headOffice?.name || effectiveHeadOfficeId}`,
          resolved.region ? `Region: ${resolved.region.name}` : 'Direct HO',
          resolved.zone ? `Zone: ${resolved.zone.name}` : 'No Zone',
        ].join(' -> ')
      : 'Independent / Single School';

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityId: created.id,
      newValues: created,
      changeSummary: `Created Branch "${created.name}" [${created.code}] under ${hierarchyPath}`,
    });

    return {
      ...created,
      loginUsername: targetUsername,
      loginStatus: input.loginStatus || 'ACTIVE',
    };
  }

  /**
   * Update an existing Branch
   */
  public static async updateBranch(
    tenantId: string,
    id: string,
    input: Partial<BranchInput>,
    userId?: string
  ) {
    const existing = await this.getBranchById(tenantId, id);

    let normalizedCode = existing.code;
    if (input.code && input.code.trim().toUpperCase() !== existing.code) {
      normalizedCode = input.code.trim().toUpperCase();
      const duplicate = await prisma.branch.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: normalizedCode,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new Error(`Another Branch with code "${normalizedCode}" already exists.`);
      }
    }

    const rawStatus = input.status !== undefined ? input.status : existing.status;
    const effectiveStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' =
      rawStatus === 'INACTIVE' ? 'INACTIVE' : rawStatus === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';

    const mergedInput: BranchInput = {
      headOfficeId: input.headOfficeId !== undefined ? input.headOfficeId : existing.headOfficeId,
      regionId: input.regionId !== undefined ? input.regionId : existing.regionId,
      zoneId: input.zoneId !== undefined ? input.zoneId : existing.zoneId,
      name: input.name !== undefined ? input.name : existing.name,
      code: normalizedCode,
      shortName: input.shortName !== undefined ? input.shortName : existing.shortName,
      schoolType: input.schoolType !== undefined ? input.schoolType : existing.schoolType,
      openingDate: input.openingDate !== undefined ? input.openingDate : existing.openingDate,
      registrationNo: input.registrationNo !== undefined ? input.registrationNo : existing.registrationNo,
      boardAffiliation: input.boardAffiliation !== undefined ? input.boardAffiliation : existing.boardAffiliation,
      countryId: input.countryId !== undefined ? input.countryId : existing.countryId,
      stateId: input.stateId !== undefined ? input.stateId : existing.stateId,
      cityId: input.cityId !== undefined ? input.cityId : existing.cityId,
      addressLine1: input.addressLine1 !== undefined ? input.addressLine1 : existing.addressLine1,
      addressLine2: input.addressLine2 !== undefined ? input.addressLine2 : existing.addressLine2,
      city: input.city !== undefined ? input.city : existing.city,
      state: input.state !== undefined ? input.state : existing.state,
      country: input.country !== undefined ? input.country : existing.country,
      postalCode: input.postalCode !== undefined ? input.postalCode : existing.postalCode,
      timezone: input.timezone !== undefined ? input.timezone : existing.timezone,
      currency: input.currency !== undefined ? input.currency : existing.currency,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      altPhone: input.altPhone !== undefined ? input.altPhone : existing.altPhone,
      email: input.email !== undefined ? input.email : existing.email,
      website: input.website !== undefined ? input.website : existing.website,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : existing.logoUrl,
      signatureUrl: input.signatureUrl !== undefined ? input.signatureUrl : (existing as any).signatureUrl,
      stampUrl: input.stampUrl !== undefined ? input.stampUrl : (existing as any).stampUrl,
      tagline: input.tagline !== undefined ? input.tagline : existing.tagline,
      principalEmployeeId: input.principalEmployeeId !== undefined ? input.principalEmployeeId : existing.principalEmployeeId,
      adminContactEmployeeId: input.adminContactEmployeeId !== undefined ? input.adminContactEmployeeId : existing.adminContactEmployeeId,
      principalName: input.principalName !== undefined ? input.principalName : existing.principalName,
      principalDesignation: input.principalDesignation !== undefined ? input.principalDesignation : (existing as any).principalDesignation,
      adminContact: input.adminContact !== undefined ? input.adminContact : existing.adminContact,
      adminContactDesignation: input.adminContactDesignation !== undefined ? input.adminContactDesignation : (existing as any).adminContactDesignation,
      genderModel: input.genderModel !== undefined ? input.genderModel : existing.genderModel,
      shiftModel: input.shiftModel !== undefined ? input.shiftModel : existing.shiftModel,
      capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
      academicPrograms: input.academicPrograms !== undefined ? input.academicPrograms : (existing as any).academicPrograms,
      offeredClassCategoryIds: input.offeredClassCategoryIds !== undefined ? input.offeredClassCategoryIds : (existing as any).offeredClassCategoryIds,
      offeredClassIds: input.offeredClassIds !== undefined ? input.offeredClassIds : (existing as any).offeredClassIds,
      academicScopeNotes: input.academicScopeNotes !== undefined ? input.academicScopeNotes : existing.academicScopeNotes,
      feeCollectionAccount: input.feeCollectionAccount !== undefined ? input.feeCollectionAccount : existing.feeCollectionAccount,
      receiptPrefix: input.receiptPrefix !== undefined ? input.receiptPrefix : existing.receiptPrefix,
      voucherPrefix: input.voucherPrefix !== undefined ? input.voucherPrefix : existing.voucherPrefix,
      status: effectiveStatus,
      remarks: input.remarks !== undefined ? input.remarks : existing.remarks,
    };

    const resolved = await this.resolveAndValidateReferences(tenantId, mergedInput);

    let parsedOpeningDate: Date | null = null;
    if (mergedInput.openingDate) {
      parsedOpeningDate = new Date(mergedInput.openingDate);
      if (isNaN(parsedOpeningDate.getTime())) {
        parsedOpeningDate = null;
      }
    }

    const effectiveHeadOfficeId = resolved.headOffice?.id || (mergedInput.headOfficeId && mergedInput.headOfficeId.trim() !== '' && mergedInput.headOfficeId !== 'INDEPENDENT' && mergedInput.headOfficeId !== 'NONE' ? mergedInput.headOfficeId.trim() : null);

    const effectiveRegionId = effectiveHeadOfficeId && resolved.region?.id
      ? resolved.region.id
      : effectiveHeadOfficeId && mergedInput.regionId && mergedInput.regionId.trim() !== '' && mergedInput.regionId !== 'NONE' && mergedInput.regionId !== 'DIRECT'
      ? mergedInput.regionId.trim()
      : null;

    const effectiveZoneId = effectiveHeadOfficeId && resolved.zone?.id
      ? resolved.zone.id
      : effectiveHeadOfficeId && mergedInput.zoneId && mergedInput.zoneId.trim() !== '' && mergedInput.zoneId !== 'NONE' && mergedInput.zoneId !== 'DIRECT'
      ? mergedInput.zoneId.trim()
      : null;

    // Handle password update if supplied
    if (input.loginPassword && input.loginPassword.trim() && prisma.user?.findFirst) {
      if (input.loginPassword.trim().length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      const newHash = await hashPassword(input.loginPassword.trim());
      const targetUsername = (input.loginUsername || existing.loginUsername || normalizedCode.toLowerCase().replace(/-/g, '_')).trim().toLowerCase();

      const user = await prisma.user.findFirst({
        where: { tenantId, username: targetUsername },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newHash,
            status: input.loginStatus || user.status,
          },
        });
      } else {
        const newUser = await prisma.user.create({
          data: {
            tenantId,
            username: targetUsername,
            email: resolved.email || `${targetUsername}@school.internal`,
            phone: resolved.phone || undefined,
            passwordHash: newHash,
            userType: 'ADMIN',
            status: input.loginStatus || 'ACTIVE',
          },
        });

        let branchRole = await prisma.role.findFirst({
          where: { tenantId, code: 'BRANCH_ADMIN' },
        });

        if (!branchRole) {
          try {
            branchRole = await prisma.role.create({
              data: {
                tenantId,
                name: 'Branch Administrator',
                code: 'BRANCH_ADMIN',
                description: 'Administrative access for Branch / Campus management',
              },
            });
          } catch {
            // Non-blocking
          }
        }

        if (branchRole) {
          try {
            await prisma.userRole.create({
              data: {
                tenantId,
                userId: newUser.id,
                roleId: branchRole.id,
              },
            });
          } catch {
            // Non-blocking
          }
        }
      }
    }

    const updateData: any = {
      name: mergedInput.name.trim(),
      code: normalizedCode,
      shortName: mergedInput.shortName ? mergedInput.shortName.trim().toUpperCase() : null,
      schoolType: mergedInput.schoolType?.trim() || 'Branch Campus',
      openingDate: parsedOpeningDate,
      registrationNo: mergedInput.registrationNo ? mergedInput.registrationNo.trim() : null,
      boardAffiliation: mergedInput.boardAffiliation ? mergedInput.boardAffiliation.trim() : null,
      addressLine1: (mergedInput.addressLine1 || 'Campus Address').trim(),
      addressLine2: mergedInput.addressLine2 ? mergedInput.addressLine2.trim() : null,
      city: resolved.city || 'Karachi',
      state: resolved.state || null,
      country: resolved.country || 'Pakistan',
      postalCode: mergedInput.postalCode ? mergedInput.postalCode.trim() : null,
      timezone: mergedInput.timezone || 'Asia/Karachi',
      currency: mergedInput.currency || 'PKR',
      phone: resolved.phone,
      altPhone: resolved.altPhone,
      email: resolved.email,
      website: resolved.website,
      logoUrl: mergedInput.logoUrl ? mergedInput.logoUrl.trim() : null,
      signatureUrl: mergedInput.signatureUrl ? mergedInput.signatureUrl.trim() : null,
      stampUrl: mergedInput.stampUrl ? mergedInput.stampUrl.trim() : null,
      tagline: mergedInput.tagline ? mergedInput.tagline.trim() : null,
      principalName: resolved.principalName,
      principalDesignation: resolved.principalDesignation,
      adminContact: resolved.adminContact,
      adminContactDesignation: resolved.adminContactDesignation,
      genderModel: mergedInput.genderModel || 'CO_ED',
      shiftModel: mergedInput.shiftModel || 'MORNING',
      capacity: mergedInput.capacity ? Number(mergedInput.capacity) : null,
      academicPrograms: mergedInput.academicPrograms || [],
      offeredClassCategoryIds: mergedInput.offeredClassCategoryIds || [],
      offeredClassIds: mergedInput.offeredClassIds || [],
      academicScopeNotes: mergedInput.academicScopeNotes ? mergedInput.academicScopeNotes.trim() : null,
      feeCollectionAccount: mergedInput.feeCollectionAccount ? mergedInput.feeCollectionAccount.trim() : null,
      receiptPrefix: mergedInput.receiptPrefix ? mergedInput.receiptPrefix.trim().toUpperCase() : 'REC',
      voucherPrefix: mergedInput.voucherPrefix ? mergedInput.voucherPrefix.trim().toUpperCase() : 'VCH',
      status: effectiveStatus,
      remarks: mergedInput.remarks ? mergedInput.remarks.trim() : null,
    };

    if (effectiveHeadOfficeId) {
      updateData.headOffice = { connect: { id: effectiveHeadOfficeId } };
    } else {
      updateData.headOffice = { disconnect: true };
    }

    if (effectiveRegionId) {
      updateData.region = { connect: { id: effectiveRegionId } };
    } else {
      updateData.region = { disconnect: true };
    }

    if (effectiveZoneId) {
      updateData.zone = { connect: { id: effectiveZoneId } };
    } else {
      updateData.zone = { disconnect: true };
    }

    if (mergedInput.countryId) {
      updateData.countryRef = { connect: { id: mergedInput.countryId } };
    } else {
      updateData.countryRef = { disconnect: true };
    }

    if (mergedInput.stateId) {
      updateData.stateRef = { connect: { id: mergedInput.stateId } };
    } else {
      updateData.stateRef = { disconnect: true };
    }

    if (mergedInput.cityId) {
      updateData.cityRef = { connect: { id: mergedInput.cityId } };
    } else {
      updateData.cityRef = { disconnect: true };
    }

    if (mergedInput.principalEmployeeId) {
      updateData.principal = { connect: { id: mergedInput.principalEmployeeId } };
    } else {
      updateData.principal = { disconnect: true };
    }

    if (mergedInput.adminContactEmployeeId) {
      updateData.adminContactPerson = { connect: { id: mergedInput.adminContactEmployeeId } };
    } else {
      updateData.adminContactPerson = { disconnect: true };
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: updateData,
      include: {
        headOffice: true,
        region: true,
        zone: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        principal: true,
        adminContactPerson: true,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated Branch details for "${updated.name}" [${updated.code}]`,
    });

    return {
      ...updated,
      loginUsername: existing.loginUsername,
      loginStatus: input.loginStatus || existing.loginStatus,
    };
  }

  /**
   * Reparent / Expand Hierarchy:
   * Moves an Independent School into a Network, or changes its Head Office / Region / Zone in-place
   * without recreating the branch record, without changing its ID or resetting historical data.
   */
  public static async reparentBranch(
    tenantId: string,
    id: string,
    hierarchyInput: {
      headOfficeId: string | null;
      regionId?: string | null;
      zoneId?: string | null;
      reason?: string;
    },
    userId?: string
  ) {
    const existing = await this.getBranchById(tenantId, id);

    let headOffice: any = null;
    let region: any = null;
    let zone: any = null;

    if (hierarchyInput.headOfficeId && hierarchyInput.headOfficeId.trim() !== '' && hierarchyInput.headOfficeId !== 'INDEPENDENT') {
      headOffice = await prisma.headOffice.findFirst({
        where: { id: hierarchyInput.headOfficeId.trim(), tenantId },
      });

      if (!headOffice) {
        throw new Error('Selected Head Office does not exist.');
      }

      if (hierarchyInput.regionId && hierarchyInput.regionId.trim() !== '' && hierarchyInput.regionId !== 'NONE') {
        region = await prisma.region.findFirst({
          where: { id: hierarchyInput.regionId.trim(), tenantId },
        });
        if (!region || region.headOfficeId !== headOffice.id) {
          throw new Error('Selected Region does not belong to the selected Head Office.');
        }
      }

      if (hierarchyInput.zoneId && hierarchyInput.zoneId.trim() !== '' && hierarchyInput.zoneId !== 'NONE') {
        zone = await prisma.zone.findFirst({
          where: { id: hierarchyInput.zoneId.trim(), tenantId },
        });
        if (!zone || zone.headOfficeId !== headOffice.id) {
          throw new Error('Selected Zone does not belong to the selected Head Office.');
        }
        if (zone.regionId && hierarchyInput.regionId && zone.regionId !== hierarchyInput.regionId.trim()) {
          throw new Error('Selected Zone belongs to a different Region than the selected Region.');
        }
      }
    }

    const oldHierarchyLineage = existing.headOffice
      ? `${existing.headOffice.name}${existing.region ? ` > ${existing.region.name}` : ''}${existing.zone ? ` > ${existing.zone.name}` : ''}`
      : 'Independent / Single School';

    const newHierarchyLineage = headOffice
      ? `${headOffice.name}${region ? ` > ${region.name}` : ''}${zone ? ` > ${zone.name}` : ''}`
      : 'Independent / Single School';

    const updateData: any = {};
    if (headOffice) {
      updateData.headOffice = { connect: { id: headOffice.id } };
      if (region) {
        updateData.region = { connect: { id: region.id } };
      } else {
        updateData.region = { disconnect: true };
      }
      if (zone) {
        updateData.zone = { connect: { id: zone.id } };
      } else {
        updateData.zone = { disconnect: true };
      }
    } else {
      updateData.headOffice = { disconnect: true };
      updateData.region = { disconnect: true };
      updateData.zone = { disconnect: true };
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: updateData,
      include: {
        headOffice: true,
        region: true,
        zone: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        principal: true,
        adminContactPerson: true,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'EXPAND_HIERARCHY',
      entityId: id,
      oldValues: {
        headOfficeId: existing.headOfficeId,
        regionId: existing.regionId,
        zoneId: existing.zoneId,
        lineage: oldHierarchyLineage,
      },
      newValues: {
        headOfficeId: updated.headOfficeId,
        regionId: updated.regionId,
        zoneId: updated.zoneId,
        lineage: newHierarchyLineage,
        reason: hierarchyInput.reason,
      },
      changeSummary: `Reassigned organization hierarchy for Branch "${updated.name}" [${updated.code}] from [${oldHierarchyLineage}] to [${newHierarchyLineage}]${hierarchyInput.reason ? ` (Reason: ${hierarchyInput.reason})` : ''}`,
    });

    return updated;
  }

  /**
   * Safe status toggle (ACTIVE / INACTIVE / ARCHIVED) with reason logging
   */
  public static async toggleBranchStatus(
    tenantId: string,
    id: string,
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    reason?: string,
    userId?: string
  ) {
    const existing = await this.getBranchById(tenantId, id);

    if (existing.status === status) {
      return existing;
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { status },
      include: {
        headOffice: true,
        region: true,
        zone: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        principal: true,
        adminContactPerson: true,
      },
    });

    const action = status === 'ACTIVE' ? 'ACTIVATE' : status === 'ARCHIVED' ? 'ARCHIVE' : 'DEACTIVATE';
    const reasonText = reason ? ` (Reason: ${reason})` : '';

    await this.logAudit({
      tenantId,
      userId,
      action,
      entityId: updated.id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status, reason },
      changeSummary: `Changed status of Branch "${updated.name}" [${updated.code}] from ${existing.status} to ${status}${reasonText}`,
    });

    return updated;
  }

  /**
   * Archive a Branch (Preserves historical data, transcript, student/billing records)
   */
  public static async archiveBranch(tenantId: string, id: string, reason?: string, userId?: string) {
    return this.toggleBranchStatus(tenantId, id, 'ARCHIVED', reason, userId);
  }

  /**
   * Delete safety check: Only allows hard-deletion for draft/fresh records with 0 operational records
   */
  public static async deleteBranch(tenantId: string, id: string, userId?: string) {
    const existing = await this.getBranchById(tenantId, id);

    // Check for operational dependencies
    const [studentCount] = await Promise.all([
      prisma.student.count({ where: { tenantId } }),
    ]);

    if (studentCount > 0 && existing.status !== 'ARCHIVED') {
      throw new Error(
        `Cannot delete operational Branch "${existing.name}". Please use "Archive" to safely preserve all transcripts, academic records, and audit history.`
      );
    }

    await prisma.branch.delete({ where: { id } });

    await this.logAudit({
      tenantId,
      userId,
      action: 'DELETE',
      entityId: id,
      oldValues: existing,
      changeSummary: `Deleted setup Branch record "${existing.name}" [${existing.code}]`,
    });

    return { success: true, deletedId: id };
  }

  /**
   * Get audit logs for a specific Branch
   */
  public static async getBranchAuditLogs(tenantId: string, id: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: 'BRANCH',
        entityId: id,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return logs;
  }
}
