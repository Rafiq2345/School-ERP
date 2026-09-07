import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { BranchService } from '@/lib/services/branch-service';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { RegionService } from '@/lib/services/region-service';
import { ZoneService } from '@/lib/services/zone-service';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { verifyPassword } from '@/lib/auth/password';

describe('BranchService (Independent Schools & Evolvable Hierarchy Redesign)', () => {
  const testTenantId = 'test-tenant-branch-' + Date.now();
  let headOfficeA: any;
  let headOfficeB: any;
  let regionA1: any;
  let regionB1: any;
  let directZoneA: any;
  let regionalZoneA1: any;
  let activeEmployee: any;

  beforeAll(async () => {
    // 1. Ensure Global Reference data
    await GlobalReferenceService.ensureReferenceDataSeeded();

    // 2. Create Test Tenant
    await prisma.tenant.upsert({
      where: { id: testTenantId },
      update: {},
      create: {
        id: testTenantId,
        name: 'Branch Test Education Foundation',
        code: 'TEST-BRANCH-' + Date.now(),
        status: 'ACTIVE',
      },
    });

    // 3. Create active HR Employee
    activeEmployee = await prisma.employee.create({
      data: {
        tenantId: testTenantId,
        employeeNo: 'EMP-BR-' + Date.now(),
        firstNameEn: 'Shahid',
        lastNameEn: 'Afridi',
        gender: 'MALE',
        currentStatus: 'ACTIVE',
      },
    });

    // 4. Create Head Office A and Head Office B
    headOfficeA = await HeadOfficeService.createHeadOffice(testTenantId, {
      name: 'Southern Secretariat Head Office',
      code: 'HO-BR-SOU',
      addressLine1: 'Executive Complex 1, Clifton',
      city: 'Karachi',
    });

    headOfficeB = await HeadOfficeService.createHeadOffice(testTenantId, {
      name: 'Northern Secretariat Head Office',
      code: 'HO-BR-NOR',
      addressLine1: 'Blue Area Tower',
      city: 'Islamabad',
    });

    // 5. Create Region A1 under Head Office A, Region B1 under Head Office B
    regionA1 = await RegionService.createRegion(testTenantId, {
      headOfficeId: headOfficeA.id,
      name: 'Sindh Coastal Region',
      code: 'REG-BR-SND',
      city: 'Karachi',
    });

    regionB1 = await RegionService.createRegion(testTenantId, {
      headOfficeId: headOfficeB.id,
      name: 'Federal Capital Region',
      code: 'REG-BR-ISB',
      city: 'Islamabad',
    });

    // 6. Create Direct Zone under Head Office A (no Region)
    directZoneA = await ZoneService.createZone(testTenantId, {
      headOfficeId: headOfficeA.id,
      name: 'Karachi Port Cluster Zone',
      code: 'ZN-BR-PORT',
      city: 'Karachi',
    });

    // 7. Create Regional Zone under Head Office A -> Region A1
    regionalZoneA1 = await ZoneService.createZone(testTenantId, {
      headOfficeId: headOfficeA.id,
      regionId: regionA1.id,
      name: 'Karachi Central Academic Zone',
      code: 'ZN-BR-CENTRAL',
      city: 'Karachi',
    });
  });

  it('Scenario 1: Creates an Independent / Single School (headOfficeId = null, regionId = null, zoneId = null)', async () => {
    const independentSchool = await BranchService.createBranch(
      testTenantId,
      {
        name: 'The Independent Premier Grammar School',
        code: 'SCH-IND-001',
        addressLine1: '12-A School Road, F-7/2',
        city: 'Islamabad',
        country: 'Pakistan',
        schoolType: 'Main Campus',
        principalName: 'Mrs. Tahira Aslam',
        principalDesignation: 'School Principal',
        phone: '+92 51 2654321',
        email: 'info@independentgrammar.edu.pk',
        loginUsername: 'ind_admin_001',
        loginPassword: 'SecurePassword123!',
        loginStatus: 'ACTIVE',
      },
      'admin-user'
    );

    expect(independentSchool).toBeDefined();
    expect(independentSchool.headOfficeId).toBeNull();
    expect(independentSchool.regionId).toBeNull();
    expect(independentSchool.zoneId).toBeNull();
    expect(independentSchool.name).toBe('The Independent Premier Grammar School');
    expect(independentSchool.city).toBe('Islamabad');
    expect(independentSchool.loginUsername).toBe('ind_admin_001');
    expect(independentSchool.loginStatus).toBe('ACTIVE');

    // Verify User record was created and hashed
    const user = await prisma.user.findFirst({
      where: { tenantId: testTenantId, username: 'ind_admin_001' },
    });
    expect(user).toBeDefined();
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe('SecurePassword123!');
    const isPasswordValid = await verifyPassword('SecurePassword123!', user!.passwordHash);
    expect(isPasswordValid).toBe(true);

    // Verify Audit log does NOT contain raw password
    const logs = await BranchService.getBranchAuditLogs(testTenantId, independentSchool.id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const createLog = logs.find((l) => l.action === 'CREATE');
    expect(createLog).toBeDefined();
    expect(createLog?.changeSummary).toContain('Independent / Single School');
    const logString = JSON.stringify(createLog);
    expect(logString).not.toContain('SecurePassword123!');
  });

  it('Scenario 2: Rejects Region or Zone assignment on an Independent School', async () => {
    await expect(
      BranchService.createBranch(testTenantId, {
        name: 'Invalid Independent School With Region',
        code: 'SCH-ERR-IND-REG',
        regionId: regionA1.id,
        addressLine1: 'Test Address',
        city: 'Karachi',
        phone: '+92 21 34980001',
        email: 'invalid@school.edu.pk',
      })
    ).rejects.toThrow('An Independent School cannot be assigned a Region without a Head Office');

    await expect(
      BranchService.createBranch(testTenantId, {
        name: 'Invalid Independent School With Zone',
        code: 'SCH-ERR-IND-ZN',
        zoneId: directZoneA.id,
        addressLine1: 'Test Address',
        city: 'Karachi',
        phone: '+92 21 34980001',
        email: 'invalid2@school.edu.pk',
      })
    ).rejects.toThrow('An Independent School cannot be assigned a Zone without a Head Office');
  });

  it('Scenario 3: Path A: Head Office -> Branch (Direct HO, No Region, No Zone)', async () => {
    const branch = await BranchService.createBranch(
      testTenantId,
      {
        headOfficeId: headOfficeA.id,
        name: 'Defence Model Campus',
        code: 'SCH-TEST-DHA',
        addressLine1: 'Phase 5, DHA, Main Khayaban-e-Shahbaz',
        city: 'Karachi',
        schoolType: 'Senior Campus',
        genderModel: 'CO_ED',
        shiftModel: 'MORNING',
        capacity: 800,
        phone: '+92 21 35841122',
        email: 'dha.campus@greenwood.edu.pk',
        principalEmployeeId: activeEmployee.id,
        logoUrl: '/uploads/organization/logo/dha-logo.png',
        signatureUrl: '/uploads/organization/signature/principal-sig.png',
        stampUrl: '/uploads/organization/stamp/official-stamp.png',
      },
      'admin-user'
    );

    expect(branch).toBeDefined();
    expect(branch.headOfficeId).toBe(headOfficeA.id);
    expect(branch.regionId).toBeNull();
    expect(branch.zoneId).toBeNull();
    expect(branch.principalName).toContain('Shahid Afridi');
    expect(branch.logoUrl).toBe('/uploads/organization/logo/dha-logo.png');
    expect(branch.signatureUrl).toBe('/uploads/organization/signature/principal-sig.png');
    expect(branch.stampUrl).toBe('/uploads/organization/stamp/official-stamp.png');
    expect(branch.status).toBe('ACTIVE');
  });

  it('Scenario 4: Path B: Head Office -> Region -> Branch (Head Office + Region, No Zone)', async () => {
    const branch = await BranchService.createBranch(
      testTenantId,
      {
        headOfficeId: headOfficeA.id,
        regionId: regionA1.id,
        name: 'Clifton Junior Campus',
        code: 'SCH-TEST-CLF',
        addressLine1: 'Block 2, Clifton',
        city: 'Karachi',
        schoolType: 'Junior Campus',
        genderModel: 'CO_ED',
        shiftModel: 'MORNING',
        capacity: 450,
        phone: '+92 21 35841133',
        email: 'clifton.campus@greenwood.edu.pk',
      },
      'admin-user'
    );

    expect(branch).toBeDefined();
    expect(branch.headOfficeId).toBe(headOfficeA.id);
    expect(branch.regionId).toBe(regionA1.id);
    expect(branch.zoneId).toBeNull();
    expect(branch.status).toBe('ACTIVE');
  });

  it('Scenario 5: Path C: Head Office -> Zone -> Branch (Direct Zone, No Region)', async () => {
    const branch = await BranchService.createBranch(
      testTenantId,
      {
        headOfficeId: headOfficeA.id,
        zoneId: directZoneA.id,
        name: 'Keamari Maritime School',
        code: 'SCH-TEST-KMR',
        addressLine1: 'Harbour Road, Keamari',
        city: 'Karachi',
        schoolType: 'Boys Campus',
        genderModel: 'BOYS_ONLY',
        shiftModel: 'MORNING',
        capacity: 600,
        phone: '+92 21 32851144',
        email: 'keamari@greenwood.edu.pk',
      },
      'admin-user'
    );

    expect(branch).toBeDefined();
    expect(branch.headOfficeId).toBe(headOfficeA.id);
    expect(branch.zoneId).toBe(directZoneA.id);
    expect(branch.regionId).toBeNull();
    expect(branch.status).toBe('ACTIVE');
  });

  it('Scenario 6: Path D: Head Office -> Region -> Zone -> Branch (Full 4-tier Hierarchy)', async () => {
    const branch = await BranchService.createBranch(
      testTenantId,
      {
        headOfficeId: headOfficeA.id,
        regionId: regionA1.id,
        zoneId: regionalZoneA1.id,
        name: 'Gulshan Senior Secondary Campus',
        code: 'SCH-TEST-GLS',
        addressLine1: 'Block 4, Gulshan-e-Iqbal',
        city: 'Karachi',
        schoolType: 'Co-Education Campus',
        boardAffiliation: 'Federal Board (FBISE)',
        genderModel: 'CO_ED',
        shiftModel: 'MULTIPLE_SHIFTS',
        capacity: 1500,
        academicPrograms: ['MATRIC', 'CAMBRIDGE', 'FBISE'],
        offeredClassCategoryIds: ['cat-early', 'cat-primary'],
        receiptPrefix: 'GSC',
        voucherPrefix: 'VCH-GSC',
        phone: '+92 21 34981155',
        email: 'gulshan@greenwood.edu.pk',
      },
      'admin-user'
    );

    expect(branch).toBeDefined();
    expect(branch.headOfficeId).toBe(headOfficeA.id);
    expect(branch.regionId).toBe(regionA1.id);
    expect(branch.zoneId).toBe(regionalZoneA1.id);
    expect(branch.receiptPrefix).toBe('GSC');
    expect(Array.isArray(branch.academicPrograms)).toBe(true);
    expect(branch.status).toBe('ACTIVE');
  });

  it('Scenario 7: Hierarchy Evolution: Reassigning an Independent School under a Head Office + Region + Zone in-place', async () => {
    // 1. Create independent school
    const school = await BranchService.createBranch(
      testTenantId,
      {
        name: 'Rawalpindi Cantonment Model School',
        code: 'SCH-RWP-001',
        addressLine1: 'The Mall, Rawalpindi Cantt',
        city: 'Rawalpindi',
        country: 'Pakistan',
        phone: '+92 51 5566778',
        email: 'cantt@school.edu.pk',
      },
      'admin-user'
    );

    const originalBranchId = school.id;
    expect(school.headOfficeId).toBeNull();

    // 2. Expand hierarchy: Reparent under Head Office B -> Region B1
    const reparented = await BranchService.reparentBranch(
      testTenantId,
      school.id,
      {
        headOfficeId: headOfficeB.id,
        regionId: regionB1.id,
        reason: 'School joined Northern Secretariat Regional Network',
      },
      'admin-user'
    );

    // ID must remain EXACTLY unchanged
    expect(reparented.id).toBe(originalBranchId);
    expect(reparented.headOfficeId).toBe(headOfficeB.id);
    expect(reparented.regionId).toBe(regionB1.id);
    expect(reparented.zoneId).toBeNull();

    // Verify audit log has old vs new lineage
    const logs = await BranchService.getBranchAuditLogs(testTenantId, school.id);
    const reparentLog = logs.find((l) => l.action === 'EXPAND_HIERARCHY');
    expect(reparentLog).toBeDefined();
    expect((reparentLog?.oldValues as any)?.lineage).toBe('Independent / Single School');
    expect((reparentLog?.newValues as any)?.lineage).toContain('Northern Secretariat Head Office');
  });

  it('Scenario 8: Rejects mismatched Region and Zone combinations across Head Offices', async () => {
    await expect(
      BranchService.createBranch(testTenantId, {
        headOfficeId: headOfficeA.id,
        regionId: regionB1.id, // regionB1 belongs to headOfficeB
        name: 'Mismatched Region School',
        code: 'SCH-ERR-REG',
        addressLine1: 'Test Address',
        city: 'Karachi',
        phone: '+92 21 34980001',
        email: 'err@school.edu.pk',
      })
    ).rejects.toThrow('Selected Parent Region does not belong to the selected Parent Head Office');

    const zoneB = await ZoneService.createZone(testTenantId, {
      headOfficeId: headOfficeB.id,
      name: 'Capital North Zone',
      code: 'ZN-BR-CAP',
      city: 'Islamabad',
    });

    await expect(
      BranchService.createBranch(testTenantId, {
        headOfficeId: headOfficeA.id,
        zoneId: zoneB.id, // zoneB belongs to headOfficeB
        name: 'Mismatched Zone School',
        code: 'SCH-ERR-ZN',
        addressLine1: 'Test Address',
        city: 'Karachi',
        phone: '+92 21 34980001',
        email: 'err2@school.edu.pk',
      })
    ).rejects.toThrow('Selected Parent Zone does not belong to the selected Parent Head Office');
  });

  it('Scenario 9: Filters Branches by structureMode (INDEPENDENT vs NETWORK)', async () => {
    const independentResults = await BranchService.getBranches(testTenantId, {
      structureMode: 'INDEPENDENT',
    });
    expect(independentResults.items.every((b) => b.headOfficeId === null)).toBe(true);

    const networkResults = await BranchService.getBranches(testTenantId, {
      structureMode: 'NETWORK',
    });
    expect(networkResults.items.every((b) => b.headOfficeId !== null)).toBe(true);

    expect(independentResults.stats.independentCount).toBeGreaterThanOrEqual(1);
    expect(networkResults.stats.networkCount).toBeGreaterThanOrEqual(1);
  });

  it('Scenario 10: Supports status toggle, archiving, and branch code generation', async () => {
    const branch = await BranchService.createBranch(
      testTenantId,
      {
        name: 'Lifecycle Test Academy',
        code: 'SCH-LC-001',
        addressLine1: 'Plot 55, Sector F-8',
        city: 'Islamabad',
        phone: '+92 51 2850000',
        email: 'lifecycle@school.edu.pk',
      },
      'admin-actor'
    );

    // Toggle to INACTIVE
    const deactivated = await BranchService.toggleBranchStatus(
      testTenantId,
      branch.id,
      'INACTIVE',
      'Undergoing scheduled summer upgrade',
      'admin-actor'
    );
    expect(deactivated.status).toBe('INACTIVE');

    // Archive
    const archived = await BranchService.archiveBranch(
      testTenantId,
      branch.id,
      'Archived for consolidation',
      'admin-actor'
    );
    expect(archived.status).toBe('ARCHIVED');

    // Branch Code generation
    const codeKHI = await BranchService.generateBranchCode(testTenantId, 'KHI');
    expect(codeKHI).toMatch(/^SCH-KHI-\d{3}$/);
  });
});
