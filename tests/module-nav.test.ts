import { describe, it, expect } from 'vitest';
import { MODULE_NAV_CONFIGS, getActiveModuleConfig } from '../src/lib/navigation/module-nav';

describe('Module Navigation & Contextual Reports/Audit Structure', () => {
  const expectedModules = [
    'admissions',
    'students',
    'academics',
    'attendance',
    'billing',
    'exams',
    'hr',
    'accounts',
    'library',
    'inventory',
    'communication',
    'settings',
  ];

  it('should define contextual sub-navigation for all major ERP modules', () => {
    expectedModules.forEach((moduleKey) => {
      const config = MODULE_NAV_CONFIGS[moduleKey];
      expect(config).toBeDefined();
      expect(config.items.length).toBeGreaterThan(3);
    });
  });

  it('should ensure the LAST option in every module sub-navigation is ALWAYS Reports & Analytics', () => {
    expectedModules.forEach((moduleKey) => {
      const config = MODULE_NAV_CONFIGS[moduleKey];
      const lastItem = config.items[config.items.length - 1];

      expect(lastItem.id).toBe('reports');
      expect(lastItem.label).toBe('Reports & Analytics');
      expect(lastItem.labelUr).toBe('رپورٹس و تجزیات');
      expect(lastItem.isReports).toBe(true);
      expect(lastItem.href).toContain('/reports');
    });
  });

  it('should ensure every module has a contextual Audit/History item', () => {
    expectedModules.forEach((moduleKey) => {
      const config = MODULE_NAV_CONFIGS[moduleKey];
      const auditItem = config.items.find((item) => item.isAudit || item.id === 'audit');

      expect(auditItem).toBeDefined();
      expect(auditItem?.href).toContain('/audit');
    });
  });

  it('should accurately resolve active module config based on pathname', () => {
    const admissionsConfig = getActiveModuleConfig('/admin/admissions/registration');
    expect(admissionsConfig?.moduleCode).toBe('ADMISSIONS');

    const billingConfig = getActiveModuleConfig('/admin/billing/collection');
    expect(billingConfig?.moduleCode).toBe('BILLING');

    const unknownConfig = getActiveModuleConfig('/unknown/path');
    expect(unknownConfig).toBeNull();
  });
});
