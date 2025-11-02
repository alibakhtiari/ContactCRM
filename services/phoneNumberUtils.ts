// Iranian Phone Number Normalization Utilities
// Handles various Iranian phone number formats and normalizes them to +98XXXXXXXXX format

export interface NormalizedPhoneNumber {
  original: string;
  normalized: string;
  isValid: boolean;
  type: 'mobile' | 'landline' | 'unknown';
}

/**
 * Normalizes Iranian phone numbers to +98XXXXXXXXX format
 * Handles multiple formats:
 * - +989123456789
 * - 00989123456789
 * - 09123456789
 * - 9123456789
 */
export function normalizeIranianPhoneNumber(phoneNumber: string): NormalizedPhoneNumber {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      original: phoneNumber || '',
      normalized: '',
      isValid: false,
      type: 'unknown'
    };
  }

  // Remove all non-numeric characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  const original = phoneNumber;

  // Remove leading + if present for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Handle Iranian mobile numbers
  if (cleaned.startsWith('98')) {
    // Format: 98XXXXXXXXX (12 digits total)
    if (cleaned.length === 12 && cleaned.startsWith('98')) {
      const number = cleaned.substring(2); // Remove '98' prefix
      if (number.startsWith('9')) {
        return {
          original,
          normalized: `+98${number}`,
          isValid: number.length === 10,
          type: number.startsWith('9') ? 'mobile' : 'unknown'
        };
      }
    }
  }

  // Handle numbers starting with 0 (domestic format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1); // Remove '0'
    
    // Mobile numbers start with 9
    if (cleaned.startsWith('9') && cleaned.length === 10) {
      return {
        original,
        normalized: `+98${cleaned}`,
        isValid: true,
        type: 'mobile'
      };
    }
    
    // Landline numbers
    if (cleaned.length >= 10 && cleaned.length <= 11) {
      // Could be landline, validate area code
      const areaCode = cleaned.substring(0, cleaned.length - 7); // Extract area code
      const number = cleaned.substring(cleaned.length - 7);
      
      // Iranian landline area codes (simplified)
      const validAreaCodes = [
        '11', '21', '31', '41', '51', '61', '71', '81', '91', // Major cities
        '13', '23', '33', '43', '53', '63', '73', '83', '93', // Other cities
        '17', '27', '37', '47', '57', '67', '77', '87', '97'  // More cities
      ];
      
      if (validAreaCodes.includes(areaCode) && number.length === 7) {
        return {
          original,
          normalized: `+98${cleaned}`,
          isValid: true,
          type: 'landline'
        };
      }
    }
  }

  // Handle direct 9XX format (without 0)
  if (cleaned.startsWith('9') && cleaned.length === 10) {
    return {
      original,
      normalized: `+98${cleaned}`,
      isValid: true,
      type: 'mobile'
    };
  }

  return {
    original,
    normalized: '',
    isValid: false,
    type: 'unknown'
  };
}

/**
 * Checks if two phone numbers are equivalent (after normalization)
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
  const normalized1 = normalizeIranianPhoneNumber(phone1);
  const normalized2 = normalizeIranianPhoneNumber(phone2);
  
  return normalized1.isValid && 
         normalized2.isValid && 
         normalized1.normalized === normalized2.normalized;
}

/**
 * Validates Iranian phone number format
 */
export function isValidIranianPhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizeIranianPhoneNumber(phoneNumber);
  return normalized.isValid;
}

/**
 * Extracts phone number from contact info
 */
export function extractPhoneNumber(contactInfo: any): string {
  if (!contactInfo) return '';
  
  // Handle various contact formats
  if (typeof contactInfo === 'string') {
    return contactInfo;
  }
  
  if (contactInfo.phoneNumber) {
    return contactInfo.phoneNumber;
  }
  
  if (contactInfo.phoneNumbers && contactInfo.phoneNumbers.length > 0) {
    // Prefer mobile numbers
    const mobilePhone = contactInfo.phoneNumbers.find((p: any) => 
      p.label?.toLowerCase().includes('mobile') || 
      p.label?.toLowerCase().includes('cell')
    );
    
    if (mobilePhone) {
      return mobilePhone.number;
    }
    
    // Return first phone number if no mobile found
    return contactInfo.phoneNumbers[0].number;
  }
  
  return '';
}

/**
 * Formats phone number for display
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  const normalized = normalizeIranianPhoneNumber(phoneNumber);
  
  if (!normalized.isValid) {
    return phoneNumber;
  }
  
  // Remove +98 prefix for display
  const withoutCountryCode = normalized.normalized.substring(3);
  
  // Format as 0912-345-6789
  if (normalized.type === 'mobile' && withoutCountryCode.length === 10) {
    return `${withoutCountryCode.substring(0, 4)}-${withoutCountryCode.substring(4, 7)}-${withoutCountryCode.substring(7)}`;
  }
  
  // Format landline as XXX-XXXXXXX
  if (normalized.type === 'landline' && withoutCountryCode.length >= 10) {
    const areaCode = withoutCountryCode.substring(0, withoutCountryCode.length - 7);
    const number = withoutCountryCode.substring(withoutCountryCode.length - 7);
    return `${areaCode}-${number}`;
  }
  
  return normalized.normalized;
}
