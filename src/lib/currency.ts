/**
 * Currency utilities for formatting and country-to-currency mapping
 * Includes all ISO 4217 world currencies
 */

// Extended currency type to include all world currencies
export type Currency = 
  | 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'AUD' | 'CAD' | 'SGD' | 'AED'
  | 'AFN' | 'ALL' | 'AMD' | 'ANG' | 'AOA' | 'ARS' | 'AWG' | 'AZN' | 'BAM' | 'BBD'
  | 'BDT' | 'BGN' | 'BHD' | 'BIF' | 'BMD' | 'BND' | 'BOB' | 'BRL' | 'BSD' | 'BTN'
  | 'BWP' | 'BYN' | 'BZD' | 'CDF' | 'CHF' | 'CLP' | 'COP' | 'CRC' | 'CUP' | 'CVE'
  | 'CZK' | 'DJF' | 'DKK' | 'DOP' | 'DZD' | 'EGP' | 'ERN' | 'ETB' | 'FJD' | 'FKP'
  | 'GEL' | 'GHS' | 'GIP' | 'GMD' | 'GNF' | 'GTQ' | 'GYD' | 'HKD' | 'HNL' | 'HRK'
  | 'HTG' | 'HUF' | 'IDR' | 'ILS' | 'IQD' | 'IRR' | 'ISK' | 'JMD' | 'JOD' | 'KES'
  | 'KGS' | 'KHR' | 'KMF' | 'KPW' | 'KRW' | 'KWD' | 'KYD' | 'KZT' | 'LAK' | 'LBP'
  | 'LKR' | 'LRD' | 'LSL' | 'LYD' | 'MAD' | 'MDL' | 'MGA' | 'MKD' | 'MMK' | 'MNT'
  | 'MOP' | 'MRU' | 'MUR' | 'MVR' | 'MWK' | 'MXN' | 'MYR' | 'MZN' | 'NAD' | 'NGN'
  | 'NIO' | 'NOK' | 'NPR' | 'NZD' | 'OMR' | 'PAB' | 'PEN' | 'PGK' | 'PHP' | 'PKR'
  | 'PLN' | 'PYG' | 'QAR' | 'RON' | 'RSD' | 'RUB' | 'RWF' | 'SAR' | 'SBD' | 'SCR'
  | 'SDG' | 'SEK' | 'SHP' | 'SLE' | 'SLL' | 'SOS' | 'SRD' | 'SSP' | 'STN' | 'SYP'
  | 'SZL' | 'THB' | 'TJS' | 'TMT' | 'TND' | 'TOP' | 'TRY' | 'TTD' | 'TVD' | 'TWD'
  | 'TZS' | 'UAH' | 'UGX' | 'UYU' | 'UZS' | 'VES' | 'VND' | 'VUV' | 'WST' | 'XAF'
  | 'XCD' | 'XOF' | 'XPF' | 'YER' | 'ZAR' | 'ZMW' | 'ZWL';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  locale: string;
}

/**
 * Comprehensive list of all world currencies (ISO 4217)
 */
export const ALL_CURRENCIES: Record<Currency, CurrencyInfo> = {
  // Major currencies
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'en-HK' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  
  // Middle East
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', locale: 'ar-SA' },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', locale: 'ar-QA' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', locale: 'ar-KW' },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', locale: 'ar-BH' },
  OMR: { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial', locale: 'ar-OM' },
  JOD: { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', locale: 'ar-JO' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', locale: 'he-IL' },
  LBP: { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', locale: 'ar-LB' },
  SYP: { code: 'SYP', symbol: '£', name: 'Syrian Pound', locale: 'ar-SY' },
  IQD: { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', locale: 'ar-IQ' },
  IRR: { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', locale: 'fa-IR' },
  YER: { code: 'YER', symbol: '﷼', name: 'Yemeni Rial', locale: 'ar-YE' },
  
  // Asia
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', locale: 'ur-PK' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  LKR: { code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee', locale: 'si-LK' },
  NPR: { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee', locale: 'ne-NP' },
  BTN: { code: 'BTN', symbol: 'Nu.', name: 'Bhutanese Ngultrum', locale: 'dz-BT' },
  MNT: { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', locale: 'mn-MN' },
  KZT: { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', locale: 'kk-KZ' },
  UZS: { code: 'UZS', symbol: 'лв', name: 'Uzbekistani Som', locale: 'uz-UZ' },
  KGS: { code: 'KGS', symbol: 'лв', name: 'Kyrgystani Som', locale: 'ky-KG' },
  TJS: { code: 'TJS', symbol: 'ЅМ', name: 'Tajikistani Somoni', locale: 'tg-TJ' },
  TMT: { code: 'TMT', symbol: 'T', name: 'Turkmenistani Manat', locale: 'tk-TM' },
  AFN: { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', locale: 'ps-AF' },
  MMK: { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', locale: 'my-MM' },
  LAK: { code: 'LAK', symbol: '₭', name: 'Lao Kip', locale: 'lo-LA' },
  KHR: { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', locale: 'km-KH' },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', locale: 'zh-TW' },
  MOP: { code: 'MOP', symbol: 'P', name: 'Macanese Pataca', locale: 'zh-MO' },
  
  // Europe
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU' },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', locale: 'ro-RO' },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', locale: 'bg-BG' },
  HRK: { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', locale: 'hr-HR' },
  RSD: { code: 'RSD', symbol: 'дин', name: 'Serbian Dinar', locale: 'sr-RS' },
  BAM: { code: 'BAM', symbol: 'КМ', name: 'Bosnia-Herzegovina Convertible Mark', locale: 'bs-BA' },
  MKD: { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar', locale: 'mk-MK' },
  ALL: { code: 'ALL', symbol: 'Lek', name: 'Albanian Lek', locale: 'sq-AL' },
  ISK: { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', locale: 'is-IS' },
  MDL: { code: 'MDL', symbol: 'lei', name: 'Moldovan Leu', locale: 'ro-MD' },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', locale: 'uk-UA' },
  BYN: { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble', locale: 'be-BY' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU' },
  GEL: { code: 'GEL', symbol: '₾', name: 'Georgian Lari', locale: 'ka-GE' },
  AMD: { code: 'AMD', symbol: '֏', name: 'Armenian Dram', locale: 'hy-AM' },
  AZN: { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', locale: 'az-AZ' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR' },
  
  // Africa
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  EGP: { code: 'EGP', symbol: '£', name: 'Egyptian Pound', locale: 'ar-EG' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'sw-KE' },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', locale: 'am-ET' },
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG' },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'sw-TZ' },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', locale: 'en-ZM' },
  ZWL: { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar', locale: 'en-ZW' },
  MAD: { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham', locale: 'ar-MA' },
  TND: { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar', locale: 'ar-TN' },
  DZD: { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar', locale: 'ar-DZ' },
  LYD: { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar', locale: 'ar-LY' },
  SDG: { code: 'SDG', symbol: 'ج.س.', name: 'Sudanese Pound', locale: 'ar-SD' },
  SSP: { code: 'SSP', symbol: '£', name: 'South Sudanese Pound', locale: 'en-SS' },
  ERN: { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa', locale: 'ti-ER' },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', locale: 'fr-XOF' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', locale: 'fr-XAF' },
  AOA: { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', locale: 'pt-AO' },
  MZN: { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', locale: 'pt-MZ' },
  MGA: { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', locale: 'mg-MG' },
  MUR: { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', locale: 'en-MU' },
  SCR: { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee', locale: 'en-SC' },
  KMF: { code: 'KMF', symbol: 'CF', name: 'Comorian Franc', locale: 'ar-KM' },
  BIF: { code: 'BIF', symbol: 'Fr', name: 'Burundian Franc', locale: 'fr-BI' },
  RWF: { code: 'RWF', symbol: 'Fr', name: 'Rwandan Franc', locale: 'rw-RW' },
  SOS: { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling', locale: 'so-SO' },
  DJF: { code: 'DJF', symbol: 'Fr', name: 'Djiboutian Franc', locale: 'fr-DJ' },
  MWK: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', locale: 'en-MW' },
  LSL: { code: 'LSL', symbol: 'L', name: 'Lesotho Loti', locale: 'en-LS' },
  SZL: { code: 'SZL', symbol: 'L', name: 'Swazi Lilangeni', locale: 'en-SZ' },
  BWP: { code: 'BWP', symbol: 'P', name: 'Botswana Pula', locale: 'en-BW' },
  NAD: { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', locale: 'en-NA' },
  CVE: { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo', locale: 'pt-CV' },
  STN: { code: 'STN', symbol: 'Db', name: 'São Tomé and Príncipe Dobra', locale: 'pt-ST' },
  GNF: { code: 'GNF', symbol: 'Fr', name: 'Guinean Franc', locale: 'fr-GN' },
  GMD: { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi', locale: 'en-GM' },
  SLL: { code: 'SLL', symbol: 'Le', name: 'Sierra Leonean Leone', locale: 'en-SL' },
  SLE: { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone (new)', locale: 'en-SL' },
  LRD: { code: 'LRD', symbol: '$', name: 'Liberian Dollar', locale: 'en-LR' },
  GIP: { code: 'GIP', symbol: '£', name: 'Gibraltar Pound', locale: 'en-GI' },
  
  // Americas
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', locale: 'es-AR' },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', locale: 'es-CL' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', locale: 'es-CO' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', locale: 'es-PE' },
  UYU: { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', locale: 'es-UY' },
  VES: { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolívar', locale: 'es-VE' },
  PAB: { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', locale: 'es-PA' },
  CRC: { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón', locale: 'es-CR' },
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', locale: 'es-GT' },
  HNL: { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', locale: 'es-HN' },
  NIO: { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba', locale: 'es-NI' },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', locale: 'es-DO' },
  HTG: { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', locale: 'ht-HT' },
  JMD: { code: 'JMD', symbol: '$', name: 'Jamaican Dollar', locale: 'en-JM' },
  BBD: { code: 'BBD', symbol: '$', name: 'Barbadian Dollar', locale: 'en-BB' },
  BSD: { code: 'BSD', symbol: '$', name: 'Bahamian Dollar', locale: 'en-BS' },
  BZD: { code: 'BZD', symbol: '$', name: 'Belize Dollar', locale: 'en-BZ' },
  TTD: { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar', locale: 'en-TT' },
  XCD: { code: 'XCD', symbol: '$', name: 'East Caribbean Dollar', locale: 'en-XCD' },
  AWG: { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin', locale: 'nl-AW' },
  ANG: { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder', locale: 'nl-AN' },
  GYD: { code: 'GYD', symbol: '$', name: 'Guyanese Dollar', locale: 'en-GY' },
  SRD: { code: 'SRD', symbol: '$', name: 'Surinamese Dollar', locale: 'nl-SR' },
  BOB: { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano', locale: 'es-BO' },
  PYG: { code: 'PYG', symbol: '₲', name: 'Paraguayan Guaraní', locale: 'es-PY' },
  FKP: { code: 'FKP', symbol: '£', name: 'Falkland Islands Pound', locale: 'en-FK' },
  
  // Oceania
  FJD: { code: 'FJD', symbol: '$', name: 'Fijian Dollar', locale: 'en-FJ' },
  PGK: { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', locale: 'en-PG' },
  SBD: { code: 'SBD', symbol: '$', name: 'Solomon Islands Dollar', locale: 'en-SB' },
  VUV: { code: 'VUV', symbol: 'Vt', name: 'Vanuatu Vatu', locale: 'en-VU' },
  TOP: { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga', locale: 'to-TO' },
  WST: { code: 'WST', symbol: 'T', name: 'Samoan Tala', locale: 'sm-WS' },
  XPF: { code: 'XPF', symbol: 'Fr', name: 'CFP Franc', locale: 'fr-XPF' },
  
  // Other
  KPW: { code: 'KPW', symbol: '₩', name: 'North Korean Won', locale: 'ko-KP' },
  CUP: { code: 'CUP', symbol: '$', name: 'Cuban Peso', locale: 'es-CU' },
  MRU: { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya', locale: 'ar-MR' },
  MVR: { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', locale: 'dv-MV' },
  TVD: { code: 'TVD', symbol: '$', name: 'Tuvaluan Dollar', locale: 'en-TV' },
  SHP: { code: 'SHP', symbol: '£', name: 'Saint Helena Pound', locale: 'en-SH' },
};

// Legacy CURRENCY_INFO for backward compatibility
export const CURRENCY_INFO: Record<string, CurrencyInfo> = ALL_CURRENCIES;

/**
 * Get currency code from country code
 */
export const getCurrencyFromCountry = (countryCode?: string): Currency => {
  if (!countryCode) return 'INR'; // Default
  
  const country = countryCode.toUpperCase();
  
  // Map countries to currencies
  const countryCurrencyMap: Record<string, Currency> = {
    // North America
    'US': 'USD',
    'CA': 'CAD',
    
    // Europe
    'GB': 'GBP',
    'UK': 'GBP',
    'IE': 'EUR',
    'FR': 'EUR',
    'DE': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'NL': 'EUR',
    'BE': 'EUR',
    'AT': 'EUR',
    'PT': 'EUR',
    'FI': 'EUR',
    'GR': 'EUR',
    'EU': 'EUR',
    
    // Asia
    'IN': 'INR',
    'JP': 'JPY',
    'CN': 'CNY',
    'SG': 'SGD',
    'AE': 'AED',
    
    // Oceania
    'AU': 'AUD',
    'NZ': 'NZD',
  };
  
  return countryCurrencyMap[country] || 'INR';
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: Currency = 'INR'): string => {
  const currencyInfo = ALL_CURRENCIES[currency] || ALL_CURRENCIES.INR;
  
  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if Intl.NumberFormat fails
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  }
};

/**
 * Format currency amount without symbol (for display)
 */
export const formatCurrencyAmount = (amount: number, currency: Currency = 'INR'): string => {
  const currencyInfo = ALL_CURRENCIES[currency] || ALL_CURRENCIES.INR;
  
  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: Currency = 'INR'): string => {
  return ALL_CURRENCIES[currency]?.symbol || '₹';
};

/**
 * Get all available currencies
 */
export const getAvailableCurrencies = (): CurrencyInfo[] => {
  return Object.values(ALL_CURRENCIES);
};
