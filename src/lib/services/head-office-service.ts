import { prisma } from '@/lib/db/prisma';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { hashPassword } from '@/lib/auth/password';

export interface HeadOfficeInput {
  name: string;
  code: string;
  shortName?: string | null;
  registrationNo?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string;
  state?: string | null;
  country?: string;
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
  timezone?: string;
  currency?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  remarks?: string | null;
}

export class HeadOfficeService {
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
        // Sanitize out any passwords if present
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
            entityType: 'HEAD_OFFICE',
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
   * Seed a primary default Head Office for the tenant if none currently exist
   */
  public static async ensureDefaultHeadOffice(tenantId: string, userId?: string) {
    // Ensure global references are seeded
    await GlobalReferenceService.ensureReferenceDataSeeded();

    const count = await prisma.headOffice.count({
      where: { tenantId },
    });

    if (count === 0) {
      const schoolProfile = await prisma.schoolProfile.findUnique({ where: { tenantId } });

      // Look up Pakistan -> Sindh -> Karachi reference IDs if available
      const pkCountry = await prisma.country.findUnique({ where: { isoCode: 'PK' } });
      const sindhState = pkCountry
        ? await prisma.stateProvince.findFirst({ where: { countryId: pkCountry.id, code: 'SD' } })
        : null;
      const karachiCity = sindhState
        ? await prisma.city.findFirst({ where: { stateId: sindhState.id, code: 'KHI' } })
        : null;

      // Look up first active employee if any
      const firstActiveEmp = await prisma.employee.findFirst({
        where: { tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });

      const defaultHO = await prisma.headOffice.create({
        data: {
          tenantId,
          name: schoolProfile?.nameEn ? `${schoolProfile.nameEn} — Central Head Office` : 'Karachi Executive Secretariat Head Office',
          code: 'HO-KHI-001',
          shortName: 'KHI-HO',
          registrationNo: schoolProfile?.registrationNo || 'REG-HO-001',
          countryId: pkCountry?.id || null,
          stateId: sindhState?.id || null,
          cityId: karachiCity?.id || null,
          addressLine1: schoolProfile?.addressEn || 'Plot 14-C, Main Shahrah-e-Faisal, Block 6, PECHS',
          addressLine2: 'Executive Wing, 4th Floor',
          city: karachiCity?.name || 'Karachi',
          state: sindhState?.name || 'Sindh',
          country: pkCountry?.name || 'Pakistan',
          postalCode: '75400',
          phone: '+92 21 34567890',
          altPhone: '+92 21 34567891',
          email: schoolProfile?.contactEmail || 'headoffice@greenwood.edu.pk',
          website: 'https://greenwood.edu.pk',
          directorEmployeeId: firstActiveEmp?.id || null,
          directorName: firstActiveEmp
            ? `${firstActiveEmp.firstNameEn} ${firstActiveEmp.lastNameEn || ''}`.trim()
            : 'Prof. Dr. Tariq Mansoor (Director General)',
          adminContact: 'Muhammad Irfan (Secretary Administration)',
          timezone: schoolProfile?.timezone || 'Asia/Karachi',
          currency: schoolProfile?.currencyCode || 'PKR',
          status: 'ACTIVE',
          remarks: 'Primary Executive Secretariat and central governing office.',
        },
      });

      await this.logAudit({
        tenantId,
        userId: userId || 'system',
        action: 'CREATE',
        entityId: defaultHO.id,
        newValues: defaultHO,
        changeSummary: `Initialized primary default Head Office: ${defaultHO.name} (${defaultHO.code})`,
      });

      return defaultHO;
    }
    return null;
  }

  /**
   * System-controlled Head Office Code Generation (e.g. HO-KHI-001)
   */
  public static async generateHeadOfficeCode(tenantId: string, cityCodeOrName?: string): Promise<string> {
    const prefix = cityCodeOrName ? cityCodeOrName.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : 'HQ';
    const effectivePrefix = prefix || 'HQ';

    // Count existing head offices with this prefix
    const existing = await prisma.headOffice.findMany({
      where: {
        tenantId,
        code: { startsWith: `HO-${effectivePrefix}-` },
      },
      select: { code: true },
    });

    const nextSeq = existing.length + 1;
    const padded = String(nextSeq).padStart(3, '0');
    return `HO-${effectivePrefix}-${padded}`;
  }

  /**
   * Search active HR employees for leadership selection
   */
  public static async getActiveEmployeesForLookup(tenantId: string, search?: string) {
    const where: any = {
      tenantId,
      currentStatus: 'ACTIVE',
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { firstNameEn: { contains: q, mode: 'insensitive' } },
        { lastNameEn: { contains: q, mode: 'insensitive' } },
        { employeeNo: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { department: { name: { contains: q, mode: 'insensitive' } } },
        { designation: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ firstNameEn: 'asc' }],
      take: 50,
    });

    return employees.map((e) => ({
      id: e.id,
      employeeNo: e.employeeNo,
      fullName: `${e.firstNameEn} ${e.lastNameEn || ''}`.trim(),
      firstNameEn: e.firstNameEn,
      lastNameEn: e.lastNameEn,
      department: e.department?.name || null,
      designation: e.designation?.name || null,
      phone: e.phone || null,
      email: e.email || null,
    }));
  }

  /**
   * Get all Head Offices with optional filtering, search, and aggregate metrics
   */
  public static async getHeadOffices(
    tenantId: string,
    options: { search?: string; status?: string; city?: string } = {}
  ) {
    await this.ensureDefaultHeadOffice(tenantId);

    const where: any = { tenantId };

    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
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
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
        { directorName: { contains: q, mode: 'insensitive' } },
        { adminContact: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, allRecords] = await Promise.all([
      prisma.headOffice.findMany({
        where,
        include: {
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
      prisma.headOffice.findMany({
        where: { tenantId },
        select: { id: true, status: true, city: true },
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
          loginStatus: loginStatus || item.status,
        };
      })
    );

    const activeCount = allRecords.filter((r) => r.status === 'ACTIVE').length;
    const inactiveCount = allRecords.filter((r) => r.status === 'INACTIVE').length;
    const uniqueCities = Array.from(new Set(allRecords.map((r) => r.city).filter(Boolean)));

    return {
      items: enrichedItems,
      stats: {
        total: allRecords.length,
        active: activeCount,
        inactive: inactiveCount,
        citiesCount: uniqueCities.length,
        availableCities: uniqueCities,
      },
    };
  }

  /**
   * Get single Head Office by ID with full relations
   */
  public static async getHeadOfficeById(tenantId: string, id: string) {
    const headOffice = await prisma.headOffice.findFirst({
      where: { id, tenantId },
      include: {
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

    if (!headOffice) {
      throw new Error(`Head Office not found with ID: ${id}`);
    }

    let loginUsername: string | null = null;
    let loginStatus: string | null = null;

    try {
      if (prisma.user?.findFirst) {
        const user = await prisma.user.findFirst({
          where: {
            tenantId,
            OR: [
              { username: headOffice.code.toLowerCase() },
              { username: headOffice.code.toLowerCase().replace(/-/g, '_') },
              ...(headOffice.email ? [{ email: headOffice.email }] : []),
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
      ...headOffice,
      loginUsername: loginUsername || headOffice.code.toLowerCase().replace(/-/g, '_'),
      loginStatus: (loginStatus as 'ACTIVE' | 'INACTIVE') || (headOffice.status as 'ACTIVE' | 'INACTIVE'),
    };
  }

  /**
   * Validate and resolve reference relations & formatting
   */
  private static async resolveAndValidateReferences(
    tenantId: string,
    input: HeadOfficeInput
  ) {
    let resolvedCountryName = input.country || 'Pakistan';
    let resolvedStateName = input.state || null;
    let resolvedCityName = input.city || '';
    let callingCode = '+92';

    // 1. Country Reference Check
    if (input.countryId) {
      const country = await prisma.country.findUnique({ where: { id: input.countryId } });
      if (!country) {
        throw new Error('Selected Country reference is invalid.');
      }
      resolvedCountryName = country.name;
      callingCode = country.phoneCallingCode;

      // 2. State Reference Check
      if (input.stateId) {
        const state = await prisma.stateProvince.findUnique({ where: { id: input.stateId } });
        if (!state || state.countryId !== input.countryId) {
          throw new Error('Selected State/Province does not belong to the selected Country.');
        }
        resolvedStateName = state.name;

        // 3. City Reference Check
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

    if (!resolvedCityName) {
      throw new Error('City is required.');
    }

    // 4. Employee Reference Checks (preserved internally for backward compatibility)
    let resolvedDirectorName = input.directorName ? input.directorName.trim() : null;
    if (input.directorEmployeeId) {
      const directorEmp = await prisma.employee.findFirst({
        where: { id: input.directorEmployeeId, tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });
      if (!directorEmp) {
        throw new Error('Selected Director must be an active employee in HR.');
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

    // 5. Phone Normalization & Validation
    const normalizedPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.phone, callingCode);
    if (!normalizedPhoneRes.isValid) {
      throw new Error(normalizedPhoneRes.error || 'Invalid official phone format.');
    }

    const normalizedAltPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.altPhone, callingCode);
    if (!normalizedAltPhoneRes.isValid) {
      throw new Error(normalizedAltPhoneRes.error || 'Invalid alternate phone format.');
    }

    // 6. Email Validation
    const emailRes = GlobalReferenceService.validateEmail(input.email);
    if (!emailRes.isValid) {
      throw new Error(emailRes.error || 'Invalid official email format.');
    }

    // 7. Website Validation
    const websiteRes = GlobalReferenceService.validateWebsite(input.website);
    if (!websiteRes.isValid) {
      throw new Error(websiteRes.error || 'Invalid website URL.');
    }

    return {
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
   * Create a new Head Office with optional Document Assets and Login Access Account
   */
  public static async createHeadOffice(tenantId: string, input: HeadOfficeInput, userId?: string) {
    if (!input.name || !input.name.trim()) {
      throw new Error('Head Office Name is required.');
    }
    if (!input.code || !input.code.trim()) {
      throw new Error('Head Office Code is required.');
    }
    if (!input.addressLine1 || !input.addressLine1.trim()) {
      throw new Error('Primary Address is required.');
    }

    const resolved = await this.resolveAndValidateReferences(tenantId, input);
    const normalizedCode = input.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = await prisma.headOffice.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new Error(`A Head Office with code "${normalizedCode}" already exists.`);
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

    // 2. Create Head Office Record
    const created = await prisma.headOffice.create({
      data: {
        tenantId,
        name: input.name.trim(),
        code: normalizedCode,
        shortName: input.shortName ? input.shortName.trim().toUpperCase() : null,
        registrationNo: input.registrationNo ? input.registrationNo.trim() : null,
        countryId: input.countryId || null,
        stateId: input.stateId || null,
        cityId: input.cityId || null,
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2 ? input.addressLine2.trim() : null,
        city: resolved.city,
        state: resolved.state,
        country: resolved.country,
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
        timezone: input.timezone || 'Asia/Karachi',
        currency: input.currency || 'PKR',
        status: input.status || input.loginStatus || 'ACTIVE',
        remarks: input.remarks ? input.remarks.trim() : null,
      },
      include: {
        countryRef: true,
        stateRef: true,
        cityRef: true,
        director: true,
        adminContactPerson: true,
      },
    });

    // 3. Create User Account for Head Office Login if password provided and User table exists
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

        // Link Super Admin or standard admin role if exists
        if (prisma.role?.findFirst && prisma.userRole?.create) {
          const adminRole =
            (await prisma.role.findFirst({ where: { tenantId, code: 'SUPER_ADMIN' } })) ||
            (await prisma.role.findFirst({ where: { tenantId } }));
          if (adminRole) {
            await prisma.userRole.create({
              data: {
                tenantId,
                userId: createdUser.id,
                roleId: adminRole.id,
              },
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        console.error('Failed to create linked User record for Head Office:', err.message);
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
      changeSummary: `Created Head Office "${created.name}" [${created.code}] with Login ID "${targetUsername}" in ${created.city}, ${created.country}`,
    });

    return {
      ...created,
      loginUsername: targetUsername,
      loginStatus: input.loginStatus || 'ACTIVE',
    };
  }

  /**
   * Update an existing Head Office with optional Document Assets and Login Access Account
   */
  public static async updateHeadOffice(
    tenantId: string,
    id: string,
    input: Partial<HeadOfficeInput>,
    userId?: string
  ) {
    const existing = await this.getHeadOfficeById(tenantId, id);

    let normalizedCode = existing.code;
    if (input.code && input.code.trim().toUpperCase() !== existing.code) {
      normalizedCode = input.code.trim().toUpperCase();
      const duplicate = await prisma.headOffice.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: normalizedCode,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new Error(`Another Head Office with code "${normalizedCode}" already exists.`);
      }
    }

    const rawStatus = input.status !== undefined ? input.status : (input.loginStatus !== undefined ? input.loginStatus : existing.status);
    const effectiveStatus: 'ACTIVE' | 'INACTIVE' = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const mergedInput: HeadOfficeInput = {
      name: input.name !== undefined ? input.name : existing.name,
      code: normalizedCode,
      shortName: input.shortName !== undefined ? input.shortName : existing.shortName,
      registrationNo: input.registrationNo !== undefined ? input.registrationNo : existing.registrationNo,
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
      loginStatus: input.loginStatus !== undefined ? input.loginStatus : effectiveStatus,
      directorEmployeeId: input.directorEmployeeId !== undefined ? input.directorEmployeeId : existing.directorEmployeeId,
      adminContactEmployeeId: input.adminContactEmployeeId !== undefined ? input.adminContactEmployeeId : existing.adminContactEmployeeId,
      directorName: input.directorName !== undefined ? input.directorName : existing.directorName,
      adminContact: input.adminContact !== undefined ? input.adminContact : existing.adminContact,
      timezone: input.timezone !== undefined ? input.timezone : existing.timezone,
      currency: input.currency !== undefined ? input.currency : existing.currency,
      status: effectiveStatus,
      remarks: input.remarks !== undefined ? input.remarks : existing.remarks,
    };

    const resolved = await this.resolveAndValidateReferences(tenantId, mergedInput);

    // 1. Update Head Office Record
    const updated = await prisma.headOffice.update({
      where: { id },
      data: {
        name: mergedInput.name.trim(),
        code: normalizedCode,
        shortName: mergedInput.shortName ? mergedInput.shortName.trim().toUpperCase() : null,
        registrationNo: mergedInput.registrationNo ? mergedInput.registrationNo.trim() : null,
        countryId: mergedInput.countryId || null,
        stateId: mergedInput.stateId || null,
        cityId: mergedInput.cityId || null,
        addressLine1: mergedInput.addressLine1.trim(),
        addressLine2: mergedInput.addressLine2 ? mergedInput.addressLine2.trim() : null,
        city: resolved.city,
        state: resolved.state,
        country: resolved.country,
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
        timezone: mergedInput.timezone || 'Asia/Karachi',
        currency: mergedInput.currency || 'PKR',
        status: effectiveStatus,
        remarks: mergedInput.remarks ? mergedInput.remarks.trim() : null,
      },
      include: {
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
            status: mergedInput.loginStatus || effectiveStatus,
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
                status: mergedInput.loginStatus || effectiveStatus,
              },
            });

            if (prisma.role?.findFirst && prisma.userRole?.create) {
              const adminRole =
                (await prisma.role.findFirst({ where: { tenantId, code: 'SUPER_ADMIN' } })) ||
                (await prisma.role.findFirst({ where: { tenantId } }));
              if (adminRole) {
                await prisma.userRole.create({
                  data: {
                    tenantId,
                    userId: newUser.id,
                    roleId: adminRole.id,
                  },
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to sync User record for Head Office:', err.message);
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
      changeSummary: `Updated Head Office details for "${updated.name}" [${updated.code}]${passwordMsg}`,
    });

    return {
      ...updated,
      loginUsername: targetUsername,
      loginStatus: mergedInput.loginStatus || effectiveStatus,
    };
  }

  /**
   * Safe status toggle (ACTIVE / INACTIVE) with reason logging
   */
  public static async toggleHeadOfficeStatus(
    tenantId: string,
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    reason?: string,
    userId?: string
  ) {
    const existing = await this.getHeadOfficeById(tenantId, id);

    if (existing.status === status) {
      return existing;
    }

    const updated = await prisma.headOffice.update({
      where: { id },
      data: { status },
      include: {
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
            data: { status },
          });
        }
      }
    } catch {
      // Non-blocking
    }

    const action = status === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE';
    const reasonText = reason ? ` (Reason: ${reason})` : '';

    await this.logAudit({
      tenantId,
      userId,
      action,
      entityId: updated.id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status, reason },
      changeSummary: `Changed status of Head Office "${updated.name}" [${updated.code}] from ${existing.status} to ${status}${reasonText}`,
    });

    return updated;
  }

  /**
   * Get audit logs for a specific Head Office
   */
  public static async getHeadOfficeAuditLogs(tenantId: string, id: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: 'HEAD_OFFICE',
        entityId: id,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return logs;
  }
}
