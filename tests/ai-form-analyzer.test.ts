import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { FormAnalyzerService } from '../src/lib/services/form-analyzer-service';
import { CustomFieldService } from '../src/lib/services/custom-field-service';

const TEST_TENANT_A = 'tenant-test-ai-form-a';
const TEST_TENANT_B = 'tenant-test-ai-form-b';

describe('AI Form-to-Fields Generator & Custom Field Engine Tests', () => {
  beforeEach(async () => {
    // Clean up
    await prisma.customFieldOption.deleteMany({ where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
    await prisma.customFieldDefinition.deleteMany({ where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });

    // Create Test Tenants
    await prisma.tenant.createMany({
      data: [
        { id: TEST_TENANT_A, name: 'Academy Alpha', code: 'SCH-AFA-1', status: 'ACTIVE' },
        { id: TEST_TENANT_B, name: 'Academy Beta', code: 'SCH-AFA-2', status: 'ACTIVE' },
      ],
    });
  });

  afterEach(async () => {
    await prisma.customFieldOption.deleteMany({ where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
    await prisma.customFieldDefinition.deleteMany({ where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [TEST_TENANT_A, TEST_TENANT_B] } } });
  });

  it('correctly matches standard fields first and does not suggest duplicate custom fields for them', () => {
    const studentNameMatch = FormAnalyzerService.matchStandardField('Candidate Name');
    expect(studentNameMatch).not.toBeNull();
    expect(studentNameMatch?.key).toBe('first_name');
    expect(studentNameMatch?.targetModel).toBe('Student');

    const dobMatch = FormAnalyzerService.matchStandardField('Date of Birth');
    expect(dobMatch).not.toBeNull();
    expect(dobMatch?.key).toBe('dob');

    const fatherCnicMatch = FormAnalyzerService.matchStandardField("Father's CNIC");
    expect(fatherCnicMatch).not.toBeNull();
    expect(fatherCnicMatch?.key).toBe('father_cnic');
    expect(fatherCnicMatch?.targetModel).toBe('Guardian');

    const bFormMatch = FormAnalyzerService.matchStandardField('B-Form Number');
    expect(bFormMatch).not.toBeNull();
    expect(bFormMatch?.key).toBe('national_id');

    // Unknown field should return null
    const customMatch = FormAnalyzerService.matchStandardField('Medical Allergies & Chronic Conditions');
    expect(customMatch).toBeNull();
  });

  it('analyzes uploaded form and does NOT create database records before user approval', async () => {
    const result = await FormAnalyzerService.analyzeFormDocument(
      TEST_TENANT_A,
      {
        fileName: 'Beaconhouse_Admission_Form.pdf',
        templatePreset: 'STANDARD_COMPREHENSIVE',
      },
      'usr-admin-test'
    );

    expect(result.detectedFields.length).toBeGreaterThan(5);
    expect(result.summary.standardMapped).toBeGreaterThan(5);
    expect(result.summary.customSuggested).toBeGreaterThan(0);

    // CRITICAL: Zero custom fields should be in DB yet
    const dbFieldsCount = await prisma.customFieldDefinition.count({
      where: { tenantId: TEST_TENANT_A },
    });
    expect(dbFieldsCount).toBe(0);
  });

  it('creates custom fields with dropdown options, required flags, and sections upon administrator approval', async () => {
    const fieldsToApprove = [
      {
        fieldLabel: 'Medical Allergies',
        fieldKey: 'medical_allergies',
        fieldType: 'TEXTAREA' as const,
        isRequired: false,
        section: 'Medical Information',
      },
      {
        fieldLabel: 'School Bus Route',
        fieldKey: 'bus_route',
        fieldType: 'DROPDOWN' as const,
        isRequired: true,
        section: 'Other Information',
        options: ['Route 1 - North', 'Route 2 - Gulshan', 'Self Conveyance'],
      },
      {
        fieldLabel: 'Hafiz-e-Quran',
        fieldKey: 'hafiz_e_quran',
        fieldType: 'DROPDOWN' as const,
        isRequired: false,
        section: 'Other Information',
        options: ['Yes', 'No'],
      },
    ];

    const approvalResult = await FormAnalyzerService.approveCustomFields(
      TEST_TENANT_A,
      fieldsToApprove,
      'usr-admin-test'
    );

    expect(approvalResult.createdCount).toBe(3);

    // Verify persistence in custom_field_definitions
    const stored = await CustomFieldService.getCustomFieldsForEntity(TEST_TENANT_A, 'STUDENT');
    expect(stored.length).toBe(3);

    const busRouteField = stored.find((f) => f.fieldKey === 'bus_route');
    expect(busRouteField).toBeDefined();
    expect(busRouteField?.isRequired).toBe(true);
    expect(busRouteField?.fieldType).toBe('DROPDOWN');
    expect(busRouteField?.options.length).toBe(3);
    expect(busRouteField?.options.map((o) => o.label)).toContain('Route 1 - North');

    // Verify duplicate approval of same key does not create duplicates
    const reApprove = await FormAnalyzerService.approveCustomFields(
      TEST_TENANT_A,
      [fieldsToApprove[0]],
      'usr-admin-test'
    );
    expect(reApprove.createdCount).toBe(0);
  });

  it('enforces strict tenant isolation for custom fields', async () => {
    // Create custom field in Tenant A
    await FormAnalyzerService.approveCustomFields(
      TEST_TENANT_A,
      [
        {
          fieldLabel: 'Special Scholarship Category',
          fieldKey: 'scholarship_category',
          fieldType: 'TEXT',
          section: 'Academic Information',
        },
      ],
      'usr-admin-a'
    );

    // Fetch for Tenant A
    const tenantAFields = await CustomFieldService.getCustomFieldsForEntity(TEST_TENANT_A, 'STUDENT');
    expect(tenantAFields.length).toBe(1);
    expect(tenantAFields[0].fieldKey).toBe('scholarship_category');

    // Fetch for Tenant B
    const tenantBFields = await CustomFieldService.getCustomFieldsForEntity(TEST_TENANT_B, 'STUDENT');
    expect(tenantBFields.length).toBe(0);
  });
});
