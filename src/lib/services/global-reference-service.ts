import { prisma } from '@/lib/db/prisma';

export interface CountryData {
  id: string;
  isoCode: string;
  iso3: string | null;
  name: string;
  officialName: string | null;
  phoneCallingCode: string;
  currencyCode: string;
  currencySymbol: string;
  defaultTimezone: string;
  displayOrder: number;
  isActive: boolean;
}

export interface StateProvinceData {
  id: string;
  countryId: string;
  code: string;
  name: string;
  type: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CityData {
  id: string;
  stateId: string;
  code: string;
  name: string;
  postalCodePattern: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface TimezoneData {
  id: string;
  identifier: string;
  label: string;
  utcOffset: string;
  countryIso: string | null;
  isActive: boolean;
}

export interface CurrencyData {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
}

export class GlobalReferenceService {
  /**
   * Seed / Ensure initial representative reference dataset (Pakistan, UK, USA, Canada, UAE, Saudi Arabia)
   */
  public static async ensureReferenceDataSeeded() {
    const countryCount = await prisma.country.count();
    if (countryCount > 0) {
      return;
    }

    // 1. Seed Currencies
    const currencies = [
      { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs.', decimals: 2 },
      { code: 'GBP', name: 'British Pound Sterling', symbol: '£', decimals: 2 },
      { code: 'USD', name: 'United States Dollar', symbol: '$', decimals: 2 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
      { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
      { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2 },
      { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
    ];

    for (const c of currencies) {
      await prisma.globalCurrency.upsert({
        where: { code: c.code },
        update: {},
        create: c,
      });
    }

    // 2. Seed Timezones
    const timezones = [
      { identifier: 'Asia/Karachi', label: '(UTC+05:00) Islamabad, Karachi - PKT', utcOffset: '+05:00', countryIso: 'PK' },
      { identifier: 'Asia/Dubai', label: '(UTC+04:00) Dubai, Abu Dhabi - GST', utcOffset: '+04:00', countryIso: 'AE' },
      { identifier: 'Asia/Riyadh', label: '(UTC+03:00) Riyadh, Jeddah - AST', utcOffset: '+03:00', countryIso: 'SA' },
      { identifier: 'Europe/London', label: '(UTC+00:00 / +01:00) London, Edinburgh - GMT/BST', utcOffset: '+00:00', countryIso: 'GB' },
      { identifier: 'America/New_York', label: '(UTC-05:00 / -04:00) New York, Washington - EST/EDT', utcOffset: '-05:00', countryIso: 'US' },
      { identifier: 'America/Chicago', label: '(UTC-06:00 / -05:00) Chicago, Dallas - CST/CDT', utcOffset: '-06:00', countryIso: 'US' },
      { identifier: 'America/Los_Angeles', label: '(UTC-08:00 / -07:00) Los Angeles, San Francisco - PST/PDT', utcOffset: '-08:00', countryIso: 'US' },
      { identifier: 'America/Toronto', label: '(UTC-05:00 / -04:00) Toronto, Ottawa - EST/EDT', utcOffset: '-05:00', countryIso: 'CA' },
      { identifier: 'America/Vancouver', label: '(UTC-08:00 / -07:00) Vancouver - PST/PDT', utcOffset: '-08:00', countryIso: 'CA' },
      { identifier: 'UTC', label: '(UTC+00:00) Coordinated Universal Time', utcOffset: '+00:00', countryIso: null },
    ];

    for (const tz of timezones) {
      await prisma.globalTimezone.upsert({
        where: { identifier: tz.identifier },
        update: {},
        create: tz,
      });
    }

    // 3. Seed Countries with States and Cities
    const countrySeeds = [
      {
        isoCode: 'PK',
        iso3: 'PAK',
        name: 'Pakistan',
        officialName: 'Islamic Republic of Pakistan',
        phoneCallingCode: '+92',
        currencyCode: 'PKR',
        currencySymbol: 'Rs.',
        defaultTimezone: 'Asia/Karachi',
        displayOrder: 1,
        states: [
          {
            code: 'SD',
            name: 'Sindh',
            type: 'PROVINCE',
            displayOrder: 1,
            cities: [
              { code: 'KHI', name: 'Karachi', displayOrder: 1 },
              { code: 'HDD', name: 'Hyderabad', displayOrder: 2 },
              { code: 'SKR', name: 'Sukkur', displayOrder: 3 },
              { code: 'LRK', name: 'Larkana', displayOrder: 4 },
            ],
          },
          {
            code: 'PB',
            name: 'Punjab',
            type: 'PROVINCE',
            displayOrder: 2,
            cities: [
              { code: 'LHR', name: 'Lahore', displayOrder: 1 },
              { code: 'RWP', name: 'Rawalpindi', displayOrder: 2 },
              { code: 'FSD', name: 'Faisalabad', displayOrder: 3 },
              { code: 'MUX', name: 'Multan', displayOrder: 4 },
              { code: 'GWA', name: 'Gujranwala', displayOrder: 5 },
              { code: 'SKT', name: 'Sialkot', displayOrder: 6 },
            ],
          },
          {
            code: 'IS',
            name: 'Islamabad Capital Territory',
            type: 'FEDERAL_TERRITORY',
            displayOrder: 3,
            cities: [
              { code: 'ISB', name: 'Islamabad', displayOrder: 1 },
            ],
          },
          {
            code: 'KP',
            name: 'Khyber Pakhtunkhwa',
            type: 'PROVINCE',
            displayOrder: 4,
            cities: [
              { code: 'PEW', name: 'Peshawar', displayOrder: 1 },
              { code: 'AAT', name: 'Abbottabad', displayOrder: 2 },
              { code: 'MDN', name: 'Mardan', displayOrder: 3 },
            ],
          },
          {
            code: 'BA',
            name: 'Balochistan',
            type: 'PROVINCE',
            displayOrder: 5,
            cities: [
              { code: 'UET', name: 'Quetta', displayOrder: 1 },
              { code: 'GWD', name: 'Gwadar', displayOrder: 2 },
            ],
          },
          {
            code: 'AJK',
            name: 'Azad Jammu & Kashmir',
            type: 'REGION',
            displayOrder: 6,
            cities: [
              { code: 'MFD', name: 'Muzaffarabad', displayOrder: 1 },
              { code: 'MPR', name: 'Mirpur', displayOrder: 2 },
            ],
          },
          {
            code: 'GB',
            name: 'Gilgit-Baltistan',
            type: 'REGION',
            displayOrder: 7,
            cities: [
              { code: 'GIL', name: 'Gilgit', displayOrder: 1 },
              { code: 'KDU', name: 'Skardu', displayOrder: 2 },
            ],
          },
        ],
      },
      {
        isoCode: 'GB',
        iso3: 'GBR',
        name: 'United Kingdom',
        officialName: 'United Kingdom of Great Britain and Northern Ireland',
        phoneCallingCode: '+44',
        currencyCode: 'GBP',
        currencySymbol: '£',
        defaultTimezone: 'Europe/London',
        displayOrder: 2,
        states: [
          {
            code: 'ENG',
            name: 'England',
            type: 'REGION',
            displayOrder: 1,
            cities: [
              { code: 'LON', name: 'London', displayOrder: 1 },
              { code: 'MAN', name: 'Manchester', displayOrder: 2 },
              { code: 'BIR', name: 'Birmingham', displayOrder: 3 },
              { code: 'LDS', name: 'Leeds', displayOrder: 4 },
            ],
          },
          {
            code: 'SCT',
            name: 'Scotland',
            type: 'REGION',
            displayOrder: 2,
            cities: [
              { code: 'EDI', name: 'Edinburgh', displayOrder: 1 },
              { code: 'GLA', name: 'Glasgow', displayOrder: 2 },
            ],
          },
          {
            code: 'WLS',
            name: 'Wales',
            type: 'REGION',
            displayOrder: 3,
            cities: [
              { code: 'CDF', name: 'Cardiff', displayOrder: 1 },
            ],
          },
          {
            code: 'NIR',
            name: 'Northern Ireland',
            type: 'REGION',
            displayOrder: 4,
            cities: [
              { code: 'BFS', name: 'Belfast', displayOrder: 1 },
            ],
          },
        ],
      },
      {
        isoCode: 'US',
        iso3: 'USA',
        name: 'United States',
        officialName: 'United States of America',
        phoneCallingCode: '+1',
        currencyCode: 'USD',
        currencySymbol: '$',
        defaultTimezone: 'America/New_York',
        displayOrder: 3,
        states: [
          {
            code: 'CA',
            name: 'California',
            type: 'STATE',
            displayOrder: 1,
            cities: [
              { code: 'LAX', name: 'Los Angeles', displayOrder: 1 },
              { code: 'SFO', name: 'San Francisco', displayOrder: 2 },
              { code: 'SAN', name: 'San Diego', displayOrder: 3 },
            ],
          },
          {
            code: 'NY',
            name: 'New York',
            type: 'STATE',
            displayOrder: 2,
            cities: [
              { code: 'NYC', name: 'New York City', displayOrder: 1 },
              { code: 'BUF', name: 'Buffalo', displayOrder: 2 },
            ],
          },
          {
            code: 'TX',
            name: 'Texas',
            type: 'STATE',
            displayOrder: 3,
            cities: [
              { code: 'HOU', name: 'Houston', displayOrder: 1 },
              { code: 'DFW', name: 'Dallas', displayOrder: 2 },
              { code: 'AUS', name: 'Austin', displayOrder: 3 },
            ],
          },
          {
            code: 'IL',
            name: 'Illinois',
            type: 'STATE',
            displayOrder: 4,
            cities: [
              { code: 'CHI', name: 'Chicago', displayOrder: 1 },
            ],
          },
        ],
      },
      {
        isoCode: 'CA',
        iso3: 'CAN',
        name: 'Canada',
        officialName: 'Canada',
        phoneCallingCode: '+1',
        currencyCode: 'CAD',
        currencySymbol: 'C$',
        defaultTimezone: 'America/Toronto',
        displayOrder: 4,
        states: [
          {
            code: 'ON',
            name: 'Ontario',
            type: 'PROVINCE',
            displayOrder: 1,
            cities: [
              { code: 'TOR', name: 'Toronto', displayOrder: 1 },
              { code: 'YOW', name: 'Ottawa', displayOrder: 2 },
            ],
          },
          {
            code: 'BC',
            name: 'British Columbia',
            type: 'PROVINCE',
            displayOrder: 2,
            cities: [
              { code: 'YVR', name: 'Vancouver', displayOrder: 1 },
            ],
          },
          {
            code: 'QC',
            name: 'Quebec',
            type: 'PROVINCE',
            displayOrder: 3,
            cities: [
              { code: 'YUL', name: 'Montreal', displayOrder: 1 },
            ],
          },
        ],
      },
      {
        isoCode: 'AE',
        iso3: 'ARE',
        name: 'United Arab Emirates',
        officialName: 'United Arab Emirates',
        phoneCallingCode: '+971',
        currencyCode: 'AED',
        currencySymbol: 'AED',
        defaultTimezone: 'Asia/Dubai',
        displayOrder: 5,
        states: [
          {
            code: 'DXB',
            name: 'Dubai',
            type: 'EMIRATE',
            displayOrder: 1,
            cities: [
              { code: 'DXB', name: 'Dubai', displayOrder: 1 },
            ],
          },
          {
            code: 'AUH',
            name: 'Abu Dhabi',
            type: 'EMIRATE',
            displayOrder: 2,
            cities: [
              { code: 'AUH', name: 'Abu Dhabi', displayOrder: 1 },
              { code: 'AAN', name: 'Al Ain', displayOrder: 2 },
            ],
          },
          {
            code: 'SHJ',
            name: 'Sharjah',
            type: 'EMIRATE',
            displayOrder: 3,
            cities: [
              { code: 'SHJ', name: 'Sharjah', displayOrder: 1 },
            ],
          },
        ],
      },
      {
        isoCode: 'SA',
        iso3: 'SAU',
        name: 'Saudi Arabia',
        officialName: 'Kingdom of Saudi Arabia',
        phoneCallingCode: '+966',
        currencyCode: 'SAR',
        currencySymbol: 'SAR',
        defaultTimezone: 'Asia/Riyadh',
        displayOrder: 6,
        states: [
          {
            code: 'RIY',
            name: 'Riyadh Region',
            type: 'REGION',
            displayOrder: 1,
            cities: [
              { code: 'RUH', name: 'Riyadh', displayOrder: 1 },
            ],
          },
          {
            code: 'MKH',
            name: 'Makkah Region',
            type: 'REGION',
            displayOrder: 2,
            cities: [
              { code: 'JED', name: 'Jeddah', displayOrder: 1 },
              { code: 'MAK', name: 'Makkah', displayOrder: 2 },
            ],
          },
          {
            code: 'EAS',
            name: 'Eastern Province',
            type: 'PROVINCE',
            displayOrder: 3,
            cities: [
              { code: 'DMM', name: 'Dammam', displayOrder: 1 },
              { code: 'KHB', name: 'Al Khobar', displayOrder: 2 },
            ],
          },
        ],
      },
    ];

    for (const cData of countrySeeds) {
      const { states, ...countryInfo } = cData;
      const createdCountry = await prisma.country.create({
        data: countryInfo,
      });

      for (const sData of states) {
        const { cities, ...stateInfo } = sData;
        const createdState = await prisma.stateProvince.create({
          data: {
            ...stateInfo,
            countryId: createdCountry.id,
          },
        });

        for (const city of cities) {
          await prisma.city.create({
            data: {
              ...city,
              stateId: createdState.id,
            },
          });
        }
      }
    }
  }

  /**
   * Get all active countries ordered by displayOrder
   */
  public static async getCountries(): Promise<CountryData[]> {
    await this.ensureReferenceDataSeeded();
    return prisma.country.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get states/provinces for a selected country
   */
  public static async getStatesByCountry(countryId: string): Promise<StateProvinceData[]> {
    await this.ensureReferenceDataSeeded();
    return prisma.stateProvince.findMany({
      where: { countryId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get cities for a selected state/province
   */
  public static async getCitiesByState(stateId: string): Promise<CityData[]> {
    await this.ensureReferenceDataSeeded();
    return prisma.city.findMany({
      where: { stateId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get all standard timezones
   */
  public static async getTimezones(): Promise<TimezoneData[]> {
    await this.ensureReferenceDataSeeded();
    return prisma.globalTimezone.findMany({
      where: { isActive: true },
      orderBy: [{ utcOffset: 'asc' }, { identifier: 'asc' }],
    });
  }

  /**
   * Get all global currencies
   */
  public static async getCurrencies(): Promise<CurrencyData[]> {
    await this.ensureReferenceDataSeeded();
    return prisma.globalCurrency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Helper: Validate & Normalize phone number to canonical international format
   * Supports spaces, hyphens, brackets, and local zero-prefixed numbers.
   */
  public static normalizePhoneNumber(
    inputPhone: string | null | undefined,
    countryCallingCode: string = '+92'
  ): { normalized: string | null; isValid: boolean; error?: string } {
    if (!inputPhone || !inputPhone.trim()) {
      return { normalized: null, isValid: true };
    }

    const trimmed = inputPhone.trim();
    const cleanDigitsAndPlus = trimmed.replace(/[^\d+]/g, '');

    // Strip leading '+' for analysis
    let digitsOnly = cleanDigitsAndPlus.replace(/\+/g, '');

    if (!digitsOnly || digitsOnly.length < 5) {
      return {
        normalized: null,
        isValid: false,
        error: 'Phone number is too short (minimum 7 digits required).',
      };
    }

    if (digitsOnly.length > 15) {
      return {
        normalized: null,
        isValid: false,
        error: 'Phone number exceeds standard maximum length (15 digits).',
      };
    }

    const cleanCallingCode = countryCallingCode.replace(/[^\d]/g, '');

    // Handle local zero prefix (e.g. 03001234567 in Pakistan -> +92 300 1234567)
    if (trimmed.startsWith('0')) {
      const withoutLeadingZero = digitsOnly.substring(1);
      const formatted = `+${cleanCallingCode} ${withoutLeadingZero}`;
      return { normalized: formatted, isValid: true };
    }

    // If starts with +, normalize spacing
    if (cleanDigitsAndPlus.startsWith('+')) {
      if (digitsOnly.startsWith(cleanCallingCode)) {
        const rest = digitsOnly.substring(cleanCallingCode.length);
        return { normalized: `+${cleanCallingCode} ${rest}`, isValid: true };
      }
      return { normalized: `+${digitsOnly}`, isValid: true };
    }

    // Default: prepend calling code
    if (digitsOnly.startsWith(cleanCallingCode)) {
      const rest = digitsOnly.substring(cleanCallingCode.length);
      return { normalized: `+${cleanCallingCode} ${rest}`, isValid: true };
    }

    return { normalized: `+${cleanCallingCode} ${digitsOnly}`, isValid: true };
  }

  /**
   * Helper: Validate RFC-compliant email supporting multi-level domains (.edu.pk, .co.uk, .org, etc.)
   */
  public static validateEmail(email: string | null | undefined): { isValid: boolean; error?: string } {
    if (!email || !email.trim()) {
      return { isValid: true };
    }

    const trimmed = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmed)) {
      return {
        isValid: false,
        error: 'Please enter a valid official email address (e.g. info@school.edu.pk).',
      };
    }

    return { isValid: true };
  }

  /**
   * Helper: Validate website URL structure
   */
  public static validateWebsite(url: string | null | undefined): {
    isValid: boolean;
    normalizedUrl: string | null;
    error?: string;
  } {
    if (!url || !url.trim()) {
      return { isValid: true, normalizedUrl: null };
    }

    let trimmed = url.trim();

    // Auto-prepend https:// if protocol is omitted
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }

    try {
      const parsed = new URL(trimmed);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return {
          isValid: false,
          normalizedUrl: null,
          error: 'Please enter a valid website domain URL (e.g. https://greenwood.edu.pk).',
        };
      }
      return { isValid: true, normalizedUrl: trimmed };
    } catch {
      return {
        isValid: false,
        normalizedUrl: null,
        error: 'Invalid website URL format.',
      };
    }
  }
}

