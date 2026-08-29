import { describe, it, expect } from 'vitest';
import { getTranslation } from '../src/lib/i18n/translations';
import { formatCurrency, formatDate, getLocaleDirection } from '../src/lib/i18n/formatters';

describe('Localization & Formatting Foundation', () => {
  it('should retrieve English and Urdu translation keys correctly', () => {
    const enTitle = getTranslation('en', 'auth.login_title');
    const urTitle = getTranslation('ur', 'auth.login_title');

    expect(enTitle).toBe('Sign In to Your Portal');
    expect(urTitle).toBe('اپنے پورٹل میں داخل ہوں');

    const enNav = getTranslation('en', 'nav.billing');
    const urNav = getTranslation('ur', 'nav.billing');

    expect(enNav).toBe('Fees & Billing');
    expect(urNav).toBe('فیس و بلنگ');

    const enAdminConfig = getTranslation('en', 'app.admin_config');
    const urAdminConfig = getTranslation('ur', 'app.admin_config');
    expect(enAdminConfig).toBe('Administration Configuration');
    expect(urAdminConfig).toBe('انتظامی ترتیبات و کنٹرول');
  });

  it('should return fallback key when translation is missing', () => {
    expect(getTranslation('en', 'non_existent.key')).toBe('non_existent.key');
  });

  it('should return correct directionality for English (LTR) and Urdu (RTL)', () => {
    expect(getLocaleDirection('en')).toBe('ltr');
    expect(getLocaleDirection('ur')).toBe('rtl');
  });

  it('should format currency consistently with locale rules', () => {
    const formattedEn = formatCurrency(15000, 'en');
    expect(formattedEn).toContain('Rs.');
    expect(formattedEn).toContain('15,000.00');

    const formattedUr = formatCurrency(15000, 'ur');
    expect(formattedUr).toContain('روپے');
  });

  it('should format dates properly', () => {
    const sampleDate = new Date('2026-08-29T12:00:00Z');
    expect(formatDate(sampleDate, 'en')).toBe('29 Aug 2026');
  });
});
