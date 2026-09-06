import { prisma } from '@/lib/db/prisma';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { RegionService } from '@/lib/services/region-service';

export interface ZoneInput {
  headOfficeId: string;
  regionId?: string | null;
  name: string;
  code: string;
  shortName?: string | null;
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
  managerEmployeeId?: string | null;
  adminContactEmployeeId?: string | null;
  managerName?: string | null;
  adminContact?: string | null;
  coverageNotes?: string | null;
  coveredDistricts?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  remarks?: string | null;
}

export class ZoneService {
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
        await prisma.auditLog.create({
          data: {
            tenantId: params.tenantId,
            userId: params.userId,
            module: 'SETTINGS',
            entityType: 'ZONE',
            entityId: params.entityId,
            action: params.action,
            oldValues: params.oldValues || undefined,
            newValues: params.newValues || undefined,
            changeSummary: params.changeSummary,
          },
        });
      }
    } catch {
      // Non-blocking audit logging
    }
  }

  /**
   * Seed a default Zone for the tenant if none currently exist
   */
  public static async ensureDefaultZone(tenantId: string, userId?: string) {
    // Ensure primary Head Office exists
    await HeadOfficeService.ensureDefaultHeadOffice(tenantId, userId);
    // Ensure primary Region exists if needed
    await RegionService.ensureDefaultRegion(tenantId, userId);

    const count = await prisma.zone.count({
      where: { tenantId },
    });

    if (count === 0) {
      const primaryHO = await prisma.headOffice.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });

      if (!primaryHO) return null;

      const primaryRegion = await prisma.region.findFirst({
        where: { tenantId, headOfficeId: primaryHO.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });

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

      const defaultZone = await prisma.zone.create({
        data: {
          tenantId,
          headOfficeId: primaryHO.id,
          regionId: primaryRegion?.id || null,
          name: 'Karachi Central Academic Zone',
          code: 'ZN-KHI-001',
          shortName: 'KC-ZONE',
          countryId: pkCountry?.id || primaryRegion?.countryId || primaryHO.countryId || null,
          stateId: sindhState?.id || primaryRegion?.stateId || primaryHO.stateId || null,
          cityId: karachiCity?.id || primaryRegion?.cityId || primaryHO.cityId || null,
          addressLine1: 'Zone 1 Administrative Office, Block 7, Gulshan-e-Iqbal',
          addressLine2: 'Academic Operations Wing, 1st Floor',
          city: karachiCity?.name || primaryRegion?.city || primaryHO.city || 'Karachi',
          state: sindhState?.name || primaryRegion?.state || primaryHO.state || 'Sindh',
          country: pkCountry?.name || primaryRegion?.country || primaryHO.country || 'Pakistan',
          postalCode: '75300',
          phone: '+92 21 34981122',
          altPhone: '+92 21 34981123',
          email: 'zone.central@greenwood.edu.pk',
          website: 'https://greenwood.edu.pk/zones/central',
          managerEmployeeId: activeEmp?.id || null,
          managerName: activeEmp
            ? `${activeEmp.firstNameEn} ${activeEmp.lastNameEn || ''}`.trim()
            : 'Tariq Mahmood (Zone Coordinator)',
          adminContact: 'Farah Naz (Zonal Academic Lead)',
          coverageNotes: 'Coordinates central metropolitan campuses, primary sections, and secondary high school branches.',
          coveredDistricts: 'Gulshan-e-Iqbal, Gulberg, Federal B Area, Liaquatabad',
          status: 'ACTIVE',
          remarks: 'Primary central academic zone established for urban cluster operations.',
        },
      });

      await this.logAudit({
        tenantId,
        userId: userId || 'system',
        action: 'CREATE',
        entityId: defaultZone.id,
        newValues: defaultZone,
        changeSummary: `Initialized default primary Zone: ${defaultZone.name} (${defaultZone.code})`,
      });

      return defaultZone;
    }
    return null;
  }

  /**
   * System-controlled Zone Code Generation (e.g. ZN-KHI-001)
   */
  public static async generateZoneCode(tenantId: string, cityCodeOrPrefix?: string): Promise<string> {
    const raw = cityCodeOrPrefix ? cityCodeOrPrefix.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : '';
    const prefix = raw || 'GEN';

    // Count existing zones with this prefix pattern
    const existing = await prisma.zone.findMany({
      where: {
        tenantId,
        code: { startsWith: `ZN-${prefix}-` },
      },
      select: { code: true },
    });

    const nextSeq = existing.length + 1;
    const padded = String(nextSeq).padStart(3, '0');
    return `ZN-${prefix}-${padded}`;
  }

  /**
   * Get all Zones with optional filtering, search, and aggregate metrics
   */
  public static async getZones(
    tenantId: string,
    options: { search?: string; status?: string; headOfficeId?: string; regionId?: string; city?: string } = {}
  ) {
    await this.ensureDefaultZone(tenantId);

    const where: any = { tenantId };

    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
    }

    if (options.headOfficeId && options.headOfficeId !== 'ALL') {
      where.headOfficeId = options.headOfficeId;
    }

    if (options.regionId) {
      if (options.regionId === 'NONE') {
        where.regionId = null;
      } else if (options.regionId !== 'ALL') {
        where.regionId = options.regionId;
      }
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
        { managerName: { contains: q, mode: 'insensitive' } },
        { adminContact: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { coveredDistricts: { contains: q, mode: 'insensitive' } },
        { headOffice: { name: { contains: q, mode: 'insensitive' } } },
        { region: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, allRecords, allHeadOffices, allRegions] = await Promise.all([
      prisma.zone.findMany({
        where,
        include: {
          headOffice: { select: { id: true, name: true, code: true, city: true, status: true } },
          region: { select: { id: true, name: true, code: true, shortName: true, city: true, status: true, headOfficeId: true } },
          countryRef: { select: { id: true, name: true, isoCode: true, phoneCallingCode: true, currencyCode: true } },
          stateRef: { select: { id: true, name: true, code: true, type: true } },
          cityRef: { select: { id: true, name: true, code: true } },
          manager: {
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
      prisma.zone.findMany({
        where: { tenantId },
        select: { id: true, status: true, city: true, headOfficeId: true, regionId: true },
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
    ]);

    const activeCount = allRecords.filter((r) => r.status === 'ACTIVE').length;
    const inactiveCount = allRecords.filter((r) => r.status === 'INACTIVE').length;
    const archivedCount = allRecords.filter((r) => r.status === 'ARCHIVED').length;
    const directHoCount = allRecords.filter((r) => !r.regionId).length;
    const uniqueCities = Array.from(new Set(allRecords.map((r) => r.city).filter(Boolean))) as string[];
    const uniqueHeadOfficesCount = new Set(allRecords.map((r) => r.headOfficeId)).size;
    const uniqueRegionsCount = new Set(allRecords.map((r) => r.regionId).filter(Boolean)).size;

    return {
      items,
      stats: {
        total: allRecords.length,
        active: activeCount,
        inactive: inactiveCount,
        archived: archivedCount,
        directHoCount,
        headOfficesCount: uniqueHeadOfficesCount,
        regionsCount: uniqueRegionsCount,
        citiesCount: uniqueCities.length,
        availableCities: uniqueCities,
        availableHeadOffices: allHeadOffices,
        availableRegions: allRegions,
      },
    };
  }

  /**
   * Get single Zone by ID with full relations
   */
  public static async getZoneById(tenantId: string, id: string) {
    const zone = await prisma.zone.findFirst({
      where: { id, tenantId },
      include: {
        headOffice: true,
        region: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        manager: {
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

    if (!zone) {
      throw new Error(`Zone not found with ID: ${id}`);
    }

    return zone;
  }

  /**
   * Validate and resolve reference relations & formatting for Zone
   */
  private static async resolveAndValidateReferences(
    tenantId: string,
    input: ZoneInput
  ) {
    // 1. Parent Head Office Validation (Mandatory for Zone)
    if (!input.headOfficeId) {
      throw new Error('Parent Head Office is required for a Zone.');
    }

    const headOffice = await prisma.headOffice.findFirst({
      where: { id: input.headOfficeId, tenantId },
    });

    if (!headOffice) {
      throw new Error('Selected Parent Head Office does not exist or does not belong to this tenant.');
    }

    // 2. Parent Region Validation (Optional for Zone)
    let region: any = null;
    if (input.regionId && input.regionId.trim() !== '') {
      region = await prisma.region.findFirst({
        where: { id: input.regionId, tenantId },
      });

      if (!region) {
        throw new Error('Selected Parent Region does not exist or does not belong to this tenant.');
      }

      if (region.headOfficeId !== input.headOfficeId) {
        throw new Error('Selected Parent Region does not belong to the selected Parent Head Office.');
      }
    }

    let resolvedCountryName = input.country || region?.country || headOffice.country || 'Pakistan';
    let resolvedStateName = input.state || region?.state || headOffice.state || null;
    let resolvedCityName = input.city || region?.city || headOffice.city || '';
    let callingCode = '+92';

    // 3. Country Reference Check
    if (input.countryId) {
      const country = await prisma.country.findUnique({ where: { id: input.countryId } });
      if (!country) {
        throw new Error('Selected Country reference is invalid.');
      }
      resolvedCountryName = country.name;
      callingCode = country.phoneCallingCode;

      // 4. State Reference Check
      if (input.stateId) {
        const state = await prisma.stateProvince.findUnique({ where: { id: input.stateId } });
        if (!state || state.countryId !== input.countryId) {
          throw new Error('Selected State/Province does not belong to the selected Country.');
        }
        resolvedStateName = state.name;

        // 5. City Reference Check
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

    // 6. Employee Reference Checks
    let resolvedManagerName = input.managerName ? input.managerName.trim() : null;
    if (input.managerEmployeeId) {
      const managerEmp = await prisma.employee.findFirst({
        where: { id: input.managerEmployeeId, tenantId, currentStatus: 'ACTIVE' },
        include: { designation: true },
      });
      if (!managerEmp) {
        throw new Error('Selected Zone Manager must be an active employee in HR.');
      }
      resolvedManagerName = `${managerEmp.firstNameEn} ${managerEmp.lastNameEn || ''}`.trim();
      if (managerEmp.designation?.name) {
        resolvedManagerName += ` (${managerEmp.designation.name})`;
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

    // 7. Phone Normalization & Validation
    const normalizedPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.phone, callingCode);
    if (!normalizedPhoneRes.isValid) {
      throw new Error(normalizedPhoneRes.error || 'Invalid official phone format.');
    }

    const normalizedAltPhoneRes = GlobalReferenceService.normalizePhoneNumber(input.altPhone, callingCode);
    if (!normalizedAltPhoneRes.isValid) {
      throw new Error(normalizedAltPhoneRes.error || 'Invalid alternate phone format.');
    }

    // 8. Email Validation
    const emailRes = GlobalReferenceService.validateEmail(input.email);
    if (!emailRes.isValid) {
      throw new Error(emailRes.error || 'Invalid official email format.');
    }

    // 9. Website Validation
    const websiteRes = GlobalReferenceService.validateWebsite(input.website);
    if (!websiteRes.isValid) {
      throw new Error(websiteRes.error || 'Invalid website URL.');
    }

    return {
      headOffice,
      region,
      country: resolvedCountryName,
      state: resolvedStateName,
      city: resolvedCityName,
      managerName: resolvedManagerName,
      adminContact: resolvedAdminContact,
      phone: normalizedPhoneRes.normalized,
      altPhone: normalizedAltPhoneRes.normalized,
      email: input.email ? input.email.trim() : null,
      website: websiteRes.normalizedUrl,
    };
  }

  /**
   * Create a new Zone
   */
  public static async createZone(tenantId: string, input: ZoneInput, userId?: string) {
    if (!input.name || !input.name.trim()) {
      throw new Error('Zone Name is required.');
    }
    if (!input.code || !input.code.trim()) {
      throw new Error('Zone Code is required.');
    }
    if (!input.headOfficeId || !input.headOfficeId.trim()) {
      throw new Error('Parent Head Office selection is required.');
    }

    const resolved = await this.resolveAndValidateReferences(tenantId, input);
    const normalizedCode = input.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = await prisma.zone.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new Error(`A Zone with code "${normalizedCode}" already exists.`);
    }

    const created = await prisma.zone.create({
      data: {
        tenantId,
        headOfficeId: input.headOfficeId.trim(),
        regionId: input.regionId && input.regionId.trim() !== '' ? input.regionId.trim() : null,
        name: input.name.trim(),
        code: normalizedCode,
        shortName: input.shortName ? input.shortName.trim().toUpperCase() : null,
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
        managerEmployeeId: input.managerEmployeeId || null,
        adminContactEmployeeId: input.adminContactEmployeeId || null,
        managerName: resolved.managerName,
        adminContact: resolved.adminContact,
        coverageNotes: input.coverageNotes ? input.coverageNotes.trim() : null,
        coveredDistricts: input.coveredDistricts ? input.coveredDistricts.trim() : null,
        status: input.status || 'ACTIVE',
        remarks: input.remarks ? input.remarks.trim() : null,
      },
      include: {
        headOffice: true,
        region: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        manager: true,
        adminContactPerson: true,
      },
    });

    const parentHierarchyDesc = resolved.region
      ? `Head Office "${resolved.headOffice.name}" -> Region "${resolved.region.name}"`
      : `Head Office "${resolved.headOffice.name}" (Direct)`;

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityId: created.id,
      newValues: created,
      changeSummary: `Created Zone "${created.name}" [${created.code}] under ${parentHierarchyDesc}`,
    });

    return created;
  }

  /**
   * Update an existing Zone
   */
  public static async updateZone(
    tenantId: string,
    id: string,
    input: Partial<ZoneInput>,
    userId?: string
  ) {
    const existing = await this.getZoneById(tenantId, id);

    let normalizedCode = existing.code;
    if (input.code && input.code.trim().toUpperCase() !== existing.code) {
      normalizedCode = input.code.trim().toUpperCase();
      const duplicate = await prisma.zone.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: normalizedCode,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new Error(`Another Zone with code "${normalizedCode}" already exists.`);
      }
    }

    const rawStatus = input.status !== undefined ? input.status : existing.status;
    const effectiveStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' =
      rawStatus === 'INACTIVE' ? 'INACTIVE' : rawStatus === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';

    const mergedInput: ZoneInput = {
      headOfficeId: input.headOfficeId !== undefined ? input.headOfficeId : existing.headOfficeId,
      regionId: input.regionId !== undefined ? input.regionId : existing.regionId,
      name: input.name !== undefined ? input.name : existing.name,
      code: normalizedCode,
      shortName: input.shortName !== undefined ? input.shortName : existing.shortName,
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
      managerEmployeeId: input.managerEmployeeId !== undefined ? input.managerEmployeeId : existing.managerEmployeeId,
      adminContactEmployeeId: input.adminContactEmployeeId !== undefined ? input.adminContactEmployeeId : existing.adminContactEmployeeId,
      managerName: input.managerName !== undefined ? input.managerName : existing.managerName,
      adminContact: input.adminContact !== undefined ? input.adminContact : existing.adminContact,
      coverageNotes: input.coverageNotes !== undefined ? input.coverageNotes : existing.coverageNotes,
      coveredDistricts: input.coveredDistricts !== undefined ? input.coveredDistricts : existing.coveredDistricts,
      status: effectiveStatus,
      remarks: input.remarks !== undefined ? input.remarks : existing.remarks,
    };

    const resolved = await this.resolveAndValidateReferences(tenantId, mergedInput);

    const updated = await prisma.zone.update({
      where: { id },
      data: {
        headOfficeId: mergedInput.headOfficeId.trim(),
        regionId: mergedInput.regionId && mergedInput.regionId.trim() !== '' ? mergedInput.regionId.trim() : null,
        name: mergedInput.name.trim(),
        code: normalizedCode,
        shortName: mergedInput.shortName ? mergedInput.shortName.trim().toUpperCase() : null,
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
        managerEmployeeId: mergedInput.managerEmployeeId || null,
        adminContactEmployeeId: mergedInput.adminContactEmployeeId || null,
        managerName: resolved.managerName,
        adminContact: resolved.adminContact,
        coverageNotes: mergedInput.coverageNotes ? mergedInput.coverageNotes.trim() : null,
        coveredDistricts: mergedInput.coveredDistricts ? mergedInput.coveredDistricts.trim() : null,
        status: effectiveStatus,
        remarks: mergedInput.remarks ? mergedInput.remarks.trim() : null,
      },
      include: {
        headOffice: true,
        region: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        manager: true,
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
      changeSummary: `Updated Zone details for "${updated.name}" [${updated.code}]`,
    });

    return updated;
  }

  /**
   * Safe status toggle (ACTIVE / INACTIVE / ARCHIVED) with reason logging
   */
  public static async toggleZoneStatus(
    tenantId: string,
    id: string,
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    reason?: string,
    userId?: string
  ) {
    const existing = await this.getZoneById(tenantId, id);

    if (existing.status === status) {
      return existing;
    }

    const updated = await prisma.zone.update({
      where: { id },
      data: { status },
      include: {
        headOffice: true,
        region: true,
        countryRef: true,
        stateRef: true,
        cityRef: true,
        manager: true,
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
      changeSummary: `Changed status of Zone "${updated.name}" [${updated.code}] from ${existing.status} to ${status}${reasonText}`,
    });

    return updated;
  }

  /**
   * Archive a Zone
   */
  public static async archiveZone(tenantId: string, id: string, reason?: string, userId?: string) {
    return this.toggleZoneStatus(tenantId, id, 'ARCHIVED', reason, userId);
  }

  /**
   * Get audit logs for a specific Zone
   */
  public static async getZoneAuditLogs(tenantId: string, id: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: 'ZONE',
        entityId: id,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return logs;
  }
}
