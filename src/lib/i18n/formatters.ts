import { SupportedLocale } from '../types';

/**
 * Formats monetary amounts according to school currency standards (e.g. Rs. 15,000.00).
 */
export function formatCurrency(amount: number, locale: SupportedLocale = 'en', currency = 'PKR'): string {
  if (locale === 'ur') {
    return `روپے ${amount.toLocaleString('ur-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats dates according to locale convention.
 */
export function formatDate(date: Date | string, locale: SupportedLocale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  if (locale === 'ur') {
    return d.toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Returns the HTML direction attribute for a given locale.
 */
export function getLocaleDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}
