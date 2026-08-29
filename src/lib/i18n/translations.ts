import en from '../../locales/en.json';
import ur from '../../locales/ur.json';
import { SupportedLocale } from '../types';

const dictionaries: Record<SupportedLocale, typeof en> = {
  en,
  ur,
};

/**
 * Resolves a dot-notated translation key for a given locale.
 * Example: t('en', 'auth.login_title') -> "Sign In to Your Portal"
 */
export function getTranslation(locale: SupportedLocale, key: string): string {
  const dict = dictionaries[locale] || dictionaries.en;
  const keys = key.split('.');

  let result: unknown = dict;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key; // Fallback to raw key if missing
    }
  }

  return typeof result === 'string' ? result : key;
}

export function useTranslations(locale: SupportedLocale = 'en') {
  return {
    t: (key: string) => getTranslation(locale, key),
    locale,
    direction: locale === 'ur' ? 'rtl' : 'ltr',
  };
}
