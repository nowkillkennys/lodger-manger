import { Address } from '../types/TenancyAgreement';

/**
 * Format an address object into a readable string
 * @param address - Address object or string
 * @returns Formatted address string
 */
export const formatAddress = (address: Address | string | null | undefined): string => {
  if (!address) return 'N/A';

  // If it's already a string, return it
  if (typeof address === 'string') return address;

  // If it's an object, format it
  if (typeof address === 'object') {
    const parts: string[] = [];
    if (address.house_number?.trim()) parts.push(address.house_number.trim());
    if (address.street_name?.trim()) parts.push(address.street_name.trim());

    const streetLine = parts.join(' ');
    const cityParts = [address.city?.trim(), address.county?.trim(), address.postcode?.trim()].filter(Boolean);

    const formatted = [streetLine, ...cityParts].filter(Boolean).join(', ');
    return formatted || 'N/A';
  }

  return 'N/A';
};