import { prisma } from '@/lib/db/prisma';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { hashPassword } from '@/lib/auth/password';

export interface RegionInput {
  headOfficeId: string;
  name: string;
  code: string;
  shortName?: string | null;
  registrationNo?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  // Login Access fields
  loginUsername?: string | null;
  loginPassword?: string | null;
  loginStatus?: 'ACTIVE' | 'INACTIVE';
  // Legacy / internal fields preserved for backward compatibility
  directorEmployeeId?: string | null;
  adminContactEmployeeId?: string | null;
  directorName?: string | null;
  adminContact?: string | null;
  coverageNotes?: string | null;
  coveredDistricts?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks?: string | null;
}

export class RegionService {
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
        // Sanitize out any passwords or hashes if present
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
            entityType: 'REGION',
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
   * Seed a default Region for the tenant if none currently exist
   */
  public static async ensureDefaultRegion(tenantId: string, userId?: string) {
    // Ensure primary Head Office exists
    await HeadOfficeService.ensureDefaultHeadOffice(tenantId, userId);

    const count = await prisma.region.count({
      where: { tenantId },
    });

    if (count === 0) {
      const primaryHO = await prisma.headOffice.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });

      if (!primaryHO) return null;

      // Look up Pakistan -> Sindh -> Karachi reference IDs if available
      const pkCountry = await prisma.country.findUnique({ where: { isoCode: 'PK' } });
      const sindhState = pkCountry
        ? await prisma.stateProvince.findFirst({ where: { countryId: pkCountry.id, code: 'SD' } })
        : null;
      const karachiCity = sindhState
        ? await prisma.city.findFirst({ where: { stateId: sindhState.id, code: 'KHI' } })
        : null;

      // Look up an active employee if any
      const activeEmp = await prisma.employee.findFirst({
        where: { tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });

      const defaultRegion = await prisma.region.create({
        data: {
          tenantId,
          headOfficeId: primaryHO.id,
          name: 'Southern Sindh & Karachi Region',
          code: 'REG-KHI-001',
          shortName: 'SSK-REG',
          registrationNo: 'REG-REG-001' as any,
          countryId: pkCountry?.id || primaryHO.countryId || null,
          stateId: sindhState?.id || primaryHO.stateId || null,
          cityId: karachiCity?.id || primaryHO.cityId || null,
          addressLine1: 'Regional Operations Hub, Suite 201, Main Shahrah-e-Faisal',
          addressLine2: 'South Wing, 2nd Floor',
          city: karachiCity?.name || primaryHO.city || 'Karachi',
          state: sindhState?.name || primaryHO.state || 'Sindh',
          country: pkCountry?.name || primaryHO.country || 'Pakistan',
          postalCode: '75400',
          phone: '+92 21 34567800',
          altPhone: '+92 21 34567801',
          email: 'region.south@greenwood.edu.pk',
          website: 'https://greenwood.edu.pk/regions/south',
          directorEmployeeId: activeEmp?.id || null,
          directorName: activeEmp
            ? `${activeEmp.firstNameEn} ${activeEmp.lastNameEn || ''}`.trim()
            : 'Dr. Shahzad Ahmed (Regional Director)',
          adminContact: 'Sohail Abbasi (Regional Operations Coordinator)',
          coverageNotes: 'Oversees southern metropolitan districts, coastal academic zones, and urban school branches.',
          coveredDistricts: 'Karachi South, Karachi East, Karachi Central, Malir, Korangi, Thatta',
          status: 'ACTIVE',
          remarks: 'Primary regional operational center for southern division.',
        } as any,
      });

      await this.logAudit({
        tenantId,
        userId: userId || 'system',
        action: 'CREATE',
        entityId: defaultRegion.id,
        newValues: defaultRegion,
        changeSummary: `Initialized default primary Region: ${defaultRegion.name} (${defaultRegion.code})`,
      });

      return defaultRegion;
    }
    return null;
  }

  /**
   * System-controlled Region Code Generation (e.g. REG-KHI-001)
   */
  public static async generateRegionCode(tenantId: string, cityCodeOrPrefix?: string): Promise<string> {
    const raw = cityCodeOrPrefix ? cityCodeOrPrefix.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : '';
    const prefix = raw || 'GEN';

    // Count existing regions with this prefix pattern
    const existing = await prisma.region.findMany({
      where: {
        tenantId,
        code: { startsWith: `REG-${prefix}-` },
      },
      select: { code: true },
    });

    const nextSeq = existing.length + 1;
    const padded = String(nextSeq).padStart(3, '0');
    return `REG-${prefix}-${padded}`;
  }

  /**
   * Get all Regions with optional filtering, search, and aggregate metrics
   */
  public static async getRegions(
    tenantId: string,
    options: { search?: string; status?: string; headOfficeId?: string; city?: string } = {}
  ) {
    await this.ensureDefaultRegion(tenantId);

    const where: any = { tenantId };

    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
    }

    if (options.headOfficeId && options.headOfficeId !== 'ALL') {
      where.headOfficeId = options.headOfficeId;
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
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
        { directorName: { contains: q, mode: 'insensitive' } },
        { adminContact: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { coveredDistricts: { contains: q, mode: 'insensitive' } },
        { headOffice: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, allRecords, allHeadOffices] = await Promise.all([
      prisma.region.findMany({
        where,
        include: {
          headOffice: { select: { id: true, name: true, code: true, city: true, status: true } },
          countryRef: { select: { id: true, name: true, isoCode: true, phoneCallingCode: true, currencyCode: true } },
          stateRef: { select: { id: true, name: true, code: true, type: true } },
          cityRef: { select: { id: true, name: true, code: true } },
          director: {
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
      prisma.region.findMany({
        where: { tenantId },
        select: { id: true, status: true, city: true, headOfficeId: true },
      }),
      prisma.headOffice.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true, city: true, status: true },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
    ]);

    // Enhance items with login user information if available
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let loginUsername: string | null = null;
        let loginStatus: string | null = null;
        try {
          if (prisma.user?.findFirst) {
            const user = await prisma.user.findFirst({
              where: {
                tenantId,
                OR: [
                  { username: item.code.toLowerCase() },
                  { username: item.code.toLowerCase().replace(/-/g, '_') },
                  ...(item.email ? [{ email: item.email }] : []),
                ],
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
          ...item,
          loginUsername: loginUsername || item.code.toLowerCase().replace(/-/g, '_'),
          loginStatus: (loginStatus as 'ACTIVE' | 'INACTIVE') || (item.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
        };
      })
    );

    const activeCount = allRecords.filter((r) => r.status === 'ACTIVE').length;
    const inactiveCount = allRecords.filter((r) => r.status === 'INACTIVE').length;
    const archivedCount = allRecords.filter((r) => r.status === 'ARCHIVED').length;
    const uniqueCities = Array.from(new Set(allRecords.map((r) => r.city).filter(Boolean))) as string[];
    const uniqueHeadOfficesCount = new Set(allRecords.map((r) => r.headOfficeId)).size;

    return {
      items: enrichedItems,
      stats: {
        total: allRecords.length,
        active: activeCount,
        inactive: inactiveCount,
        archived: archivedCount,
        headOfficesCount: uniqueHeadOfficesCount,
        citiesCount: uniqueCities.length,
        availableCities: uniqueCities,
        availableHeadOffices: allHeadOffices,
      },
    };
  }

  /**
   * Get single Region by ID with full relations
   */
  public static async getRegionById(tenantId: string, id: string) {
    const region = await prisma.region.findFirst({
      where: { id, tenantId },
      include: {
        headOffice: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        director: {
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

    if (!region) {
      throw new Error(`Region not found with ID: ${id}`);
    }

    let loginUsername: string | null = null;
    let loginStatus: string | null = null;

    try {
      if (prisma.user?.findFirst) {
        const user = await prisma.user.findFirst({
          where: {
            tenantId,
            OR: [
              { username: region.code.toLowerCase() },
              { username: region.code.toLowerCase().replace(/-/g, '_') },
              ...(region.email ? [{ email: region.email }] : []),
            ],
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
      ...region,
      loginUsername: loginUsername || region.code.toLowerCase().replace(/-/g, '_'),
      registrationNo: (region as any).registrationNo || region.shortName || null,
      loginStatus: (loginStatus as 'ACTIVE' | 'INACTIVE') || (region.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
    };
  }

  /**
   * Validate and resolve reference relations & formatting for Region
   */
  private static async resolveAndValidateReferences(
    tenantId: string,
    input: RegionInput
  ) {
    // 1. Parent Head Office Validation (Mandatory for Region)
    if (!input.headOfficeId || !input.headOfficeId.trim()) {
      throw new Error('Parent Head Office selection is mandatory. A Region cannot exist without a Parent Head Office.');
    }

    const headOffice = await prisma.headOffice.findFirst({
      where: { id: input.headOfficeId.trim(), tenantId },
    });

    if (!headOffice) {
      throw new Error('Selected Parent Head Office does not exist or does not belong to this organization.');
    }

    let resolvedCountryName = input.country || headOffice.country || 'Pakistan';
    let resolvedStateName = input.state || headOffice.state || null;
    let resolvedCityName = input.city || headOffice.city || '';
    let callingCode = '+92';

    // 2. Country Reference Check
    if (input.countryId) {
      const country = await prisma.country.findUnique({ where: { id: input.countryId } });
      if (!country) {
        throw new Error('Selected Country reference is invalid.');
      }
      resolvedCountryName = country.name;
      callingCode = country.phoneCallingCode;

      // 3. State Reference Check
      if (input.stateId) {
        const state = await prisma.stateProvince.findUnique({ where: { id: input.stateId } });
        if (!state || state.countryId !== input.countryId) {
          throw new Error('Selected State/Province does not belong to the selected Country.');
        }
        resolvedStateName = state.name;

        // 4. City Reference Check
        if (input.cityId) {
          const city = await prisma.city.findUnique({ where: { id: input.cityId } });
          if (!city || city.stateId !== input.stateId) {
            throw new Error('Selected City does not belong to the selected State/Province.');
          }
          resolvedCityName = city.name;
        }
      }
    }

    if (!resolvedCityName && input.city) {
      resolvedCityName = input.city.trim();
    }

    // 5. Employee Reference Checks (preserved internally for backward compatibility)
    let resolvedDirectorName = input.directorName ? input.directorName.trim() : null;
    if (input.directorEmployeeId) {
      const directorEmp = await prisma.employee.findFirst({
        where: { id: input.directorEmployeeId, tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });
      if (!directorEmp) {
        throw new Error('Selected Regional Director must be an active employee in HR.');
      }
      resolvedDirectorName = `${directorEmp.firstNameEn} ${directorEmp.lastNameEn || ''}`.trim();
      if (directorEmp.designation?.name) {
        resolvedDirectorName += ` (${directorEmp.designation.name})`;
      }
    }

    let resolvedAdminContact = input.adminContact ? input.adminContact.trim() : null;
    if (input.adminContactEmployeeId) {
      const adminEmp = await prisma.employee.findFirst({
        where: { id: input.adminContactEmployeeId, tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });
      if (!adminEmp) {
        throw new Error('Selected Administrative Contact must be an active employee in HR.');
      }
      resolvedAdminContact = `${adminEmp.firstNameEn} ${adminEmp.lastNameEn || ''}`.trim();
      if (adminEmp.designation?.name) {
        resolvedAdminContact += ` (${adminEmp.designation.name})`;
      }
    }

    // 6. Phone Normalization & Validation
    const normalizedPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.phone, callingCode);
    if (!normalizedPhoneRes.isValid) {
      throw new Error(normalizedPhoneRes.error || 'Invalid official phone format.');
    }

    const normalizedAltPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.altPhone, callingCode);
    if (!normalizedAltPhoneRes.isValid) {
      throw new Error(normalizedAltPhoneRes.error || 'Invalid alternate phone format.');
    }

    // 7. Email Validation
    const emailRes = GlobalReferenceService.validateEmail(input.email);
    if (!emailRes.isValid) {
      throw new Error(emailRes.error || 'Invalid official email format.');
    }

    // 8. Website Validation
    const websiteRes = GlobalReferenceService.validateWebsite(input.website);
    if (!websiteRes.isValid) {
      throw new Error(websiteRes.error || 'Invalid website URL.');
    }

    return {
      headOffice,
      country: resolvedCountryName,
      state: resolvedStateName,
      city: resolvedCityName,
      directorName: resolvedDirectorName,
      adminContact: resolvedAdminContact,
      phone: normalizedPhoneRes.normalized,
      altPhone: normalizedAltPhoneRes.normalized,
      email: input.email ? input.email.trim() : null,
      website: websiteRes.normalizedUrl,
    };
  }

  /**
   * Create a new Region with optional Document Assets and Login Access Account
   */
  public static async createRegion(tenantId: string, input: RegionInput, userId?: string) {
    if (!input.name || !input.name.trim()) {
      throw new Error('Region Name is required.');
    }
    if (!input.code || !input.code.trim()) {
      throw new Error('Region Code is required.');
    }
    if (!input.headOfficeId || !input.headOfficeId.trim()) {
      throw new Error('Parent Head Office selection is mandatory. A Region cannot exist without a Parent Head Office.');
    }

    const resolved = await this.resolveAndValidateReferences(tenantId, input);
    const normalizedCode = input.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = await prisma.region.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new Error(`A Region with code "${normalizedCode}" already exists.`);
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

    // 2. Create Region Record
    const created = await prisma.region.create({
      data: {
        tenantId,
        headOfficeId: input.headOfficeId.trim(),
        name: input.name.trim(),
        code: normalizedCode,
        shortName: (input.registrationNo || input.shortName ? (input.registrationNo || input.shortName)!.trim() : null),
        countryId: input.countryId || null,
        stateId: input.stateId || null,
        cityId: input.cityId || null,
        addressLine1: input.addressLine1 ? input.addressLine1.trim() : null,
        addressLine2: input.addressLine2 ? input.addressLine2.trim() : null,
        city: resolved.city || null,
        state: resolved.state || null,
        country: resolved.country || null,
        postalCode: input.postalCode ? input.postalCode.trim() : null,
        phone: resolved.phone,
        altPhone: resolved.altPhone,
        email: resolved.email,
        website: resolved.website,
        logoUrl: input.logoUrl || null,
        signatureUrl: input.signatureUrl || null,
        stampUrl: input.stampUrl || null,
        directorEmployeeId: input.directorEmployeeId || null,
        adminContactEmployeeId: input.adminContactEmployeeId || null,
        directorName: resolved.directorName,
        adminContact: resolved.adminContact,
        coverageNotes: input.coverageNotes ? input.coverageNotes.trim() : null,
        coveredDistricts: input.coveredDistricts ? input.coveredDistricts.trim() : null,
        status: input.status || input.loginStatus || 'ACTIVE',
        remarks: input.remarks ? input.remarks.trim() : null,
      } as any,
      include: {
        headOffice: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        director: true,
        adminContactPerson: true,
      },
    });

    // 3. Create User Account for Region Login if password provided and User table exists
    if (passwordHash && prisma.user?.create) {
      try {
        const createdUser = await prisma.user.create({
          data: {
            tenantId,
            username: targetUsername,
            email: resolved.email || undefined,
            phone: resolved.phone || undefined,
            passwordHash,
            userType: 'ADMIN',
            status: input.loginStatus || 'ACTIVE',
          },
        });

        // Link Region Admin or default role if exists
        if (prisma.role?.findFirst && prisma.userRole?.create) {
          const regionRole =
            (await prisma.role.findFirst({ where: { tenantId, code: 'REGION_ADMIN' } })) ||
            (await prisma.role.findFirst({ where: { tenantId, code: 'SUPER_ADMIN' } })) ||
            (await prisma.role.findFirst({ where: { tenantId } }));
          if (regionRole) {
            await prisma.userRole.create({
              data: {
                tenantId,
                userId: createdUser.id,
                roleId: regionRole.id,
              },
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        console.error('Failed to create linked User record for Region:', err.message);
      }
    }

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityId: created.id,
      newValues: {
        ...created,
        loginUsername: targetUsername,
        loginStatus: input.loginStatus || 'ACTIVE',
      },
      changeSummary: `Created Region "${created.name}" [${created.code}] under Head Office "${resolved.headOffice.name}" with Login ID "${targetUsername}"`,
    });

    return {
      ...created,
      loginUsername: targetUsername,
      loginStatus: input.loginStatus || 'ACTIVE',
    };
  }

  /**
   * Update an existing Region with optional Document Assets and Login Access Account
   */
  public static async updateRegion(
    tenantId: string,
    id: string,
    input: Partial<RegionInput>,
    userId?: string
  ) {
    const existing = await this.getRegionById(tenantId, id);

    let normalizedCode = existing.code;
    if (input.code && input.code.trim().toUpperCase() !== existing.code) {
      normalizedCode = input.code.trim().toUpperCase();
      const duplicate = await prisma.region.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: normalizedCode,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new Error(`Another Region with code "${normalizedCode}" already exists.`);
      }
    }

    const rawStatus = input.status !== undefined ? input.status : (input.loginStatus !== undefined ? input.loginStatus : existing.status);
    const effectiveStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' =
      rawStatus === 'INACTIVE' ? 'INACTIVE' : rawStatus === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';

    const mergedInput: RegionInput = {
      headOfficeId: input.headOfficeId !== undefined ? input.headOfficeId : existing.headOfficeId,
      name: input.name !== undefined ? input.name : existing.name,
      code: normalizedCode,
      shortName: input.shortName !== undefined ? input.shortName : existing.shortName,
      registrationNo: input.registrationNo !== undefined ? input.registrationNo : ((existing as any).registrationNo || null),
      countryId: input.countryId !== undefined ? input.countryId : existing.countryId,
      stateId: input.stateId !== undefined ? input.stateId : existing.stateId,
      cityId: input.cityId !== undefined ? input.cityId : existing.cityId,
      addressLine1: input.addressLine1 !== undefined ? input.addressLine1 : existing.addressLine1,
      addressLine2: input.addressLine2 !== undefined ? input.addressLine2 : existing.addressLine2,
      city: input.city !== undefined ? input.city : existing.city,
      state: input.state !== undefined ? input.state : existing.state,
      country: input.country !== undefined ? input.country : existing.country,
      postalCode: input.postalCode !== undefined ? input.postalCode : existing.postalCode,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      altPhone: input.altPhone !== undefined ? input.altPhone : existing.altPhone,
      email: input.email !== undefined ? input.email : existing.email,
      website: input.website !== undefined ? input.website : existing.website,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : existing.logoUrl,
      signatureUrl: input.signatureUrl !== undefined ? input.signatureUrl : existing.signatureUrl,
      stampUrl: input.stampUrl !== undefined ? input.stampUrl : existing.stampUrl,
      loginUsername: input.loginUsername !== undefined ? input.loginUsername : existing.loginUsername,
      loginStatus: input.loginStatus !== undefined ? input.loginStatus : (effectiveStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
      directorEmployeeId: input.directorEmployeeId !== undefined ? input.directorEmployeeId : existing.directorEmployeeId,
      adminContactEmployeeId: input.adminContactEmployeeId !== undefined ? input.adminContactEmployeeId : existing.adminContactEmployeeId,
      directorName: input.directorName !== undefined ? input.directorName : existing.directorName,
      adminContact: input.adminContact !== undefined ? input.adminContact : existing.adminContact,
      coverageNotes: input.coverageNotes !== undefined ? input.coverageNotes : existing.coverageNotes,
      coveredDistricts: input.coveredDistricts !== undefined ? input.coveredDistricts : existing.coveredDistricts,
      status: effectiveStatus,
      remarks: input.remarks !== undefined ? input.remarks : existing.remarks,
    };

    const resolved = await this.resolveAndValidateReferences(tenantId, mergedInput);

    // 1. Update Region Record
    const updated = await prisma.region.update({
      where: { id },
      data: {
        headOfficeId: mergedInput.headOfficeId.trim(),
        name: mergedInput.name.trim(),
        code: normalizedCode,
        shortName: (mergedInput.registrationNo || mergedInput.shortName ? (mergedInput.registrationNo || mergedInput.shortName)!.trim() : null),
        countryId: mergedInput.countryId || null,
        stateId: mergedInput.stateId || null,
        cityId: mergedInput.cityId || null,
        addressLine1: mergedInput.addressLine1 ? mergedInput.addressLine1.trim() : null,
        addressLine2: mergedInput.addressLine2 ? mergedInput.addressLine2.trim() : null,
        city: resolved.city || null,
        state: resolved.state || null,
        country: resolved.country || null,
        postalCode: mergedInput.postalCode ? mergedInput.postalCode.trim() : null,
        phone: resolved.phone,
        altPhone: resolved.altPhone,
        email: resolved.email,
        website: resolved.website,
        logoUrl: mergedInput.logoUrl || null,
        signatureUrl: mergedInput.signatureUrl || null,
        stampUrl: mergedInput.stampUrl || null,
        directorEmployeeId: mergedInput.directorEmployeeId || null,
        adminContactEmployeeId: mergedInput.adminContactEmployeeId || null,
        directorName: resolved.directorName,
        adminContact: resolved.adminContact,
        coverageNotes: mergedInput.coverageNotes ? mergedInput.coverageNotes.trim() : null,
        coveredDistricts: mergedInput.coveredDistricts ? mergedInput.coveredDistricts.trim() : null,
        status: effectiveStatus,
        remarks: mergedInput.remarks ? mergedInput.remarks.trim() : null,
      } as any,
      include: {
        headOffice: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        director: true,
        adminContactPerson: true,
      },
    });

    // 2. Handle Linked User Account Updates (Username, Status, Password Reset)
    const targetUsername = (mergedInput.loginUsername || normalizedCode.toLowerCase().replace(/-/g, '_')).trim().toLowerCase();
    let passwordChanged = false;

    if (prisma.user?.findFirst) {
      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            tenantId,
            OR: [
              { username: existing.code.toLowerCase() },
              { username: existing.code.toLowerCase().replace(/-/g, '_') },
              { username: targetUsername },
              ...(existing.email ? [{ email: existing.email }] : []),
            ],
          },
        });

        if (existingUser) {
          const userUpdateData: any = {
            username: targetUsername,
            status: mergedInput.loginStatus || (effectiveStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
            email: resolved.email || undefined,
            phone: resolved.phone || undefined,
          };

          if (input.loginPassword && input.loginPassword.trim()) {
            if (input.loginPassword.trim().length < 8) {
              throw new Error('Password must be at least 8 characters long.');
            }
            userUpdateData.passwordHash = await hashPassword(input.loginPassword.trim());
            passwordChanged = true;
          }

          if (prisma.user?.update) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: userUpdateData,
            });
          }
        } else if (input.loginPassword && input.loginPassword.trim()) {
          // User did not exist yet; create now
          if (input.loginPassword.trim().length < 8) {
            throw new Error('Password must be at least 8 characters long.');
          }
          const passwordHash = await hashPassword(input.loginPassword.trim());
          passwordChanged = true;

          if (prisma.user?.create) {
            const newUser = await prisma.user.create({
              data: {
                tenantId,
                username: targetUsername,
                email: resolved.email || undefined,
                phone: resolved.phone || undefined,
                passwordHash,
                userType: 'ADMIN',
                status: mergedInput.loginStatus || (effectiveStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
              },
            });

            if (prisma.role?.findFirst && prisma.userRole?.create) {
              const regionRole =
                (await prisma.role.findFirst({ where: { tenantId, code: 'REGION_ADMIN' } })) ||
                (await prisma.role.findFirst({ where: { tenantId, code: 'SUPER_ADMIN' } })) ||
                (await prisma.role.findFirst({ where: { tenantId } }));
              if (regionRole) {
                await prisma.userRole.create({
                  data: {
                    tenantId,
                    userId: newUser.id,
                    roleId: regionRole.id,
                  },
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to sync User record for Region:', err.message);
      }
    }

    const passwordMsg = passwordChanged ? ' and reset login password' : '';
    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityId: updated.id,
      oldValues: { ...existing, passwordChanged: false },
      newValues: { ...updated, loginUsername: targetUsername, loginStatus: mergedInput.loginStatus, passwordChanged },
      changeSummary: `Updated Region details for "${updated.name}" [${updated.code}]${passwordMsg}`,
    });

    return {
      ...updated,
      loginUsername: targetUsername,
      loginStatus: mergedInput.loginStatus || (effectiveStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
    };
  }

  /**
   * Safe status toggle (ACTIVE / INACTIVE / ARCHIVED) with reason logging
   */
  public static async toggleRegionStatus(
    tenantId: string,
    id: string,
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    reason?: string,
    userId?: string
  ) {
    const existing = await this.getRegionById(tenantId, id);

    if (existing.status === status) {
      return existing;
    }

    const updated = await prisma.region.update({
      where: { id },
      data: { status },
      include: {
        headOffice: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        director: true,
        adminContactPerson: true,
      },
    });

    // Also sync User account status if available
    try {
      if (prisma.user?.findFirst && prisma.user?.update) {
        const user = await prisma.user.findFirst({
          where: {
            tenantId,
            OR: [
              { username: existing.code.toLowerCase() },
              { username: existing.code.toLowerCase().replace(/-/g, '_') },
              ...(existing.email ? [{ email: existing.email }] : []),
            ],
          },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' },
          });
        }
      }
    } catch {
      // Non-blocking
    }

    const action = status === 'ACTIVE' ? 'ACTIVATE' : status === 'ARCHIVED' ? 'ARCHIVE' : 'DEACTIVATE';
    const reasonText = reason ? ` (Reason: ${reason})` : '';

    await this.logAudit({
      tenantId,
      userId,
      action,
      entityId: updated.id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status, reason },
      changeSummary: `Changed status of Region "${updated.name}" [${updated.code}] from ${existing.status} to ${status}${reasonText}`,
    });

    return updated;
  }

  /**
   * Archive a Region
   */
  public static async archiveRegion(tenantId: string, id: string, reason?: string, userId?: string) {
    return this.toggleRegionStatus(tenantId, id, 'ARCHIVED', reason, userId);
  }

  /**
   * Get audit logs for a specific Region
   */
  public static async getRegionAuditLogs(tenantId: string, id: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: 'REGION',
        entityId: id,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return logs;
  }
}
