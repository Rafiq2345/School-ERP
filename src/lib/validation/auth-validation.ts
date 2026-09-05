/**
 * Authentication and Contact Validation Utilities
 * Strict validation and normalization for Pakistan local mobile numbers (03XXXXXXXXX),
 * country-aware phone interfaces, RFC-compliant email addresses, and polymorphic account identifiers.
 */

export type CountryCode = 'PK' | 'INTL';

export interface ValidationResult<T = string> {
  isValid: boolean;
  normalized?: T;
  error?: string;
}

export type AccountIdentifierType = 'MOBILE' | 'EMAIL' | 'USERNAME';

export interface IdentifierValidationResult {
  isValid: boolean;
  type: AccountIdentifierType;
  normalized: string;
  error?: string;
}

export const FIELD_MAX_LENGTHS = {
  USERNAME: 100,
  EMAIL: 254,
  MOBILE_FORMATTED: 14,
  MOBILE_CANONICAL: 11,
  PASSWORD: 128,
  COMMENTS: 500,
} as const;

/**
 * Normalizes a Pakistan mobile number input to canonical 11-digit format (03XXXXXXXXX).
 * Removes accidental whitespace and formatting hyphens/dashes.
 * Converts +923XXXXXXXXX / 923XXXXXXXXX to 03XXXXXXXXX.
 */
export function normalizePakistanMobile(rawInput: string | null | undefined): string {
  if (!rawInput) return '';
  let cleaned = rawInput.trim().replace(/[\s\-\u2013\u2014]/g, '');
  if (cleaned.startsWith('+923')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('923') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Country-aware mobile normalization.
 */
export function normalizeMobile(rawInput: string | null | undefined, country: CountryCode = 'PK'): string {
  if (country === 'PK') {
    return normalizePakistanMobile(rawInput);
  }
  if (!rawInput) return '';
  return rawInput.trim().replace(/[\s\-\u2013\u2014]/g, '');
}

/**
 * Strict Pakistan Mobile Number Validator
 * Rules:
 * - Digits only after removing spaces/dashes
 * - Exactly 11 digits
 * - Must start with '03'
 * - Reject letters, slashes, and unsupported symbols
 * Example valid: 03308114136, 0330-8114136, 0330 8114136
 * Example invalid: 0310012345 (10 digits), 031001234567 (12 digits), 04100123456, 03A00123456, 0310/0123456
 */
export function validatePakistanMobile(rawInput: string | null | undefined): ValidationResult {
  const trimmed = (rawInput || '').trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Enter a valid 11-digit mobile number (e.g. 03001234567).',
    };
  }

  // Reject unsupported characters upfront (e.g., slashes, letters, symbols other than + - space)
  if (/[^\d\s\-\+\u2013\u2014]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Enter a valid 11-digit mobile number (e.g. 03001234567).',
    };
  }

  // Normalize spaces and dashes
  const normalized = normalizePakistanMobile(trimmed);

  // Must be exactly 11 digits starting with 03
  const pkMobileRegex = /^03\d{9}$/;

  if (!pkMobileRegex.test(normalized)) {
    return {
      isValid: false,
      error: 'Enter a valid 11-digit mobile number (e.g. 03001234567).',
    };
  }

  return {
    isValid: true,
    normalized,
  };
}

/**
 * Country-aware Mobile Validator.
 */
export function validateMobile(rawInput: string | null | undefined, country: CountryCode = 'PK'): ValidationResult {
  if (country === 'PK') {
    return validatePakistanMobile(rawInput);
  }
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Enter a valid mobile number.' };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { isValid: false, error: 'Enter a valid mobile number.' };
  }
  return { isValid: true, normalized: digits };
}

/**
 * Strict RFC-compliant Email Validator
 * Rules:
 * - Total length <= 254 chars
 * - No spaces inside email
 * - Exactly one @ separator
 * - Local part: 1-64 characters, valid chars, no leading/trailing dot or consecutive dots (..)
 * - Domain part: valid labels separated by dots, TLD >= 2 alphabetic chars
 * Supports multi-level domains such as .com.pk, .edu.pk, .co.uk, .org, .edu
 */
export function validateEmail(rawInput: string | null | undefined): ValidationResult {
  const trimmed = (rawInput || '').trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
    };
  }

  // Check overall length
  if (trimmed.length > FIELD_MAX_LENGTHS.EMAIL) {
    return {
      isValid: false,
      error: 'Email address exceeds maximum permitted length (254 characters).',
    };
  }

  // No whitespace inside email
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Email address must not contain spaces.',
    };
  }

  const atParts = trimmed.split('@');
  if (atParts.length !== 2) {
    return {
      isValid: false,
      error: 'Enter a valid email address with a single "@" symbol.',
    };
  }

  const [localPart, domainPart] = atParts;

  // Local part validation
  if (!localPart || localPart.length > 64) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
    };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
    };
  }

  // Check local part valid characters
  const localRegex = /^[a-zA-Z0-9.!#\$%&'*+/=?^_`{\|}~-]+$/;
  if (!localRegex.test(localPart)) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
    };
  }

  // Domain part validation
  if (!domainPart || domainPart.length > 253) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
    };
  }

  if (domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.includes('..')) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
    };
  }

  const domainLabels = domainPart.split('.');
  if (domainLabels.length < 2) {
    return {
      isValid: false,
      error: 'Enter a valid email address with a valid domain.',
    };
  }

  for (const label of domainLabels) {
    if (!label || label.length > 63 || label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: 'Enter a valid email address.',
      };
    }
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return {
        isValid: false,
        error: 'Enter a valid email address.',
      };
    }
  }

  // TLD must be at least 2 alphabetic characters
  const tld = domainLabels[domainLabels.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return {
      isValid: false,
      error: 'Enter a valid email address with a valid top-level domain.',
    };
  }

  return {
    isValid: true,
    normalized: trimmed.toLowerCase(),
  };
}

/**
 * Polymorphic Account Identifier Validator
 * Supports:
 * - Username (e.g. 'admin', 'EMP-101', 'STU-2026-001', 'emp.tariq')
 * - Registered Mobile (03XXXXXXXXX, 03XX-XXXXXXX, +923XXXXXXXXX)
 * - Email (user@domain.com)
 */
export function validateAccountIdentifier(rawInput: string | null | undefined): IdentifierValidationResult {
  const trimmed = (rawInput || '').trim();

  if (!trimmed) {
    return {
      isValid: false,
      type: 'USERNAME',
      normalized: '',
      error: 'Please enter your username, registered email, or mobile number.',
    };
  }

  if (trimmed.length > FIELD_MAX_LENGTHS.USERNAME) {
    return {
      isValid: false,
      type: 'USERNAME',
      normalized: trimmed,
      error: 'Identifier exceeds maximum allowed length.',
    };
  }

  // 1. Email check: if it contains '@', it MUST be a strictly valid email
  if (trimmed.includes('@')) {
    const emailResult = validateEmail(trimmed);
    if (!emailResult.isValid) {
      return {
        isValid: false,
        type: 'EMAIL',
        normalized: trimmed,
        error: emailResult.error || 'Enter a valid email address.',
      };
    }
    return {
      isValid: true,
      type: 'EMAIL',
      normalized: emailResult.normalized!,
    };
  }

  // 2. Mobile check: if it appears to be a phone number attempt
  const cleanedForCheck = trimmed.replace(/[\s\-\u2013\u2014]/g, '');
  const isMobileAttempt = 
    cleanedForCheck.startsWith('03') ||
    cleanedForCheck.startsWith('+92') ||
    cleanedForCheck.startsWith('923') ||
    /^\d+$/.test(cleanedForCheck);

  if (isMobileAttempt) {
    const mobileResult = validatePakistanMobile(trimmed);
    if (!mobileResult.isValid) {
      return {
        isValid: false,
        type: 'MOBILE',
        normalized: trimmed,
        error: mobileResult.error || 'Enter a valid 11-digit mobile number (e.g. 03001234567).',
      };
    }

    return {
      isValid: true,
      type: 'MOBILE',
      normalized: mobileResult.normalized!,
    };
  }

  // 3. Username / School ID check (e.g., 'admin', 'emp.tariq', 'EMP-101')
  if (trimmed.length < 2) {
    return {
      isValid: false,
      type: 'USERNAME',
      normalized: trimmed,
      error: 'Please enter a valid account identifier.',
    };
  }

  return {
    isValid: true,
    type: 'USERNAME',
    normalized: trimmed,
  };
}
