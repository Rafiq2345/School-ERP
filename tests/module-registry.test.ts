import { describe, it, expect } from 'vitest';
import {
  MODULE_REGISTRY,
  getAllModules,
  getBaseModules,
  getOptionalModules,
  getModulesForTier,
  isModuleEnabledForTenant,
  resolveActiveModulesForTenant,
} from '../src/lib/modules/module-registry';

describe('Central Module Registry Architecture Tests', () => {
  it('defines all required Base School ERP modules', () => {
    const baseModules = getBaseModules();
    const baseCodes = baseModules.map((m: any) => m.code);

    expect(baseCodes).toContain('STUDENTS');
    expect(baseCodes).toContain('BILLING');
    expect(baseCodes).toContain('ATTENDANCE');
    expect(baseCodes).toContain('HOMEWORK');
    expect(baseCodes).toContain('EXAMS');
    expect(baseCodes).toContain('HR_PAYROLL');
    expect(baseCodes).toContain('COMMUNICATION');
    expect(baseCodes).toContain('REPORTS');
    expect(baseCodes).toContain('CONFIG');
    expect(baseCodes).toContain('SECURITY');
    expect(baseCodes).toContain('PUBLISHING');
    expect(baseCodes).toContain('AUDIT');
  });

  it('keeps Base ERP uncluttered by marking optional modules appropriately', () => {
    const optionalModules = getOptionalModules();
    const optionalCodes = optionalModules.map((m: any) => m.code);

    expect(optionalCodes).toContain('ADMISSIONS');
    expect(optionalCodes).toContain('ACCOUNTS');
    expect(optionalCodes).toContain('LIBRARY');
    expect(optionalCodes).toContain('INVENTORY');
    expect(optionalCodes).toContain('ADVANCED_PAYROLL');
    expect(optionalCodes).toContain('BUDGET');
    expect(optionalCodes).toContain('BIOMETRIC_INTEGRATION');
  });

  it('enables correct modules per Product Tier', () => {
    const baseTier = resolveActiveModulesForTenant('BASE');
    expect(baseTier).toContain('STUDENTS');
    expect(baseTier).toContain('BILLING');
    expect(baseTier).toContain('HR_PAYROLL');
    expect(baseTier).not.toContain('ACCOUNTS');
    expect(baseTier).not.toContain('BUDGET');

    const standardTier = resolveActiveModulesForTenant('STANDARD');
    expect(standardTier).toContain('ADMISSIONS');
    expect(standardTier).toContain('LIBRARY');
    expect(standardTier).not.toContain('BUDGET');

    const fullTier = resolveActiveModulesForTenant('FULL');
    expect(fullTier).toContain('ACCOUNTS');
    expect(fullTier).toContain('INVENTORY');
    expect(fullTier).toContain('ADVANCED_PAYROLL');

    const enterpriseTier = resolveActiveModulesForTenant('ENTERPRISE');
    expect(enterpriseTier).toContain('BUDGET');
    expect(enterpriseTier).toContain('FIXED_ASSETS');
    expect(enterpriseTier).toContain('CUSTOM_REPORT_DESIGNER');
  });

  it('respects per-tenant custom feature overrides while protecting base modules', () => {
    // Enable Library for a BASE client
    const isLibraryEnabled = isModuleEnabledForTenant('LIBRARY', 'BASE', { LIBRARY: true });
    expect(isLibraryEnabled).toBe(true);

    // Attempt to disable BILLING (base module) -> should remain protected/enabled
    const isBillingEnabled = isModuleEnabledForTenant('BILLING', 'BASE', { BILLING: false });
    expect(isBillingEnabled).toBe(true);

    // Disable Admissions for an ENTERPRISE client
    const isAdmissionsEnabled = isModuleEnabledForTenant('ADMISSIONS', 'ENTERPRISE', { ADMISSIONS: false });
    expect(isAdmissionsEnabled).toBe(false);
  });
});
