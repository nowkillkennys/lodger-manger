import { formatAddress } from '../addressUtils';
import type { Address } from '../../types/TenancyAgreement';

describe('formatAddress', () => {
  it('formats a complete address object correctly', () => {
    const address: Address = {
      house_number: '123',
      street_name: 'Main Street',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('123 Main Street, London, Greater London, SW1A 1AA');
  });

  it('handles missing house_number', () => {
    const address: Address = {
      street_name: 'Main Street',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('Main Street, London, Greater London, SW1A 1AA');
  });

  it('handles missing street_name', () => {
    const address: Address = {
      house_number: '123',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('123, London, Greater London, SW1A 1AA');
  });

  it('handles missing city', () => {
    const address: Address = {
      house_number: '123',
      street_name: 'Main Street',
      county: 'Greater London',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('123 Main Street, Greater London, SW1A 1AA');
  });

  it('handles missing county', () => {
    const address: Address = {
      house_number: '123',
      street_name: 'Main Street',
      city: 'London',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('123 Main Street, London, SW1A 1AA');
  });

  it('handles missing postcode', () => {
    const address: Address = {
      house_number: '123',
      street_name: 'Main Street',
      city: 'London',
      county: 'Greater London'
    };
    const result = formatAddress(address);
    expect(result).toBe('123 Main Street, London, Greater London');
  });

  it('handles address with only house_number and street_name', () => {
    const address: Address = {
      house_number: '123',
      street_name: 'Main Street'
    };
    const result = formatAddress(address);
    expect(result).toBe('123 Main Street');
  });

  it('handles address with only city parts', () => {
    const address: Address = {
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('London, Greater London, SW1A 1AA');
  });

  it('returns the string input as is', () => {
    const input = '123 Main Street, London';
    const result = formatAddress(input);
    expect(result).toBe(input);
  });

  it('returns "N/A" for null input', () => {
    const result = formatAddress(null);
    expect(result).toBe('N/A');
  });

  it('returns "N/A" for undefined input', () => {
    const result = formatAddress(undefined);
    expect(result).toBe('N/A');
  });

  it('returns "N/A" for empty object', () => {
    const address = {} as Address;
    const result = formatAddress(address);
    expect(result).toBe('N/A');
  });

  it('handles whitespace in fields by trimming', () => {
    const address: Address = {
      house_number: '  123  ',
      street_name: '  Main Street  ',
      city: '  London  ',
      county: '  Greater London  ',
      postcode: '  SW1A 1AA  '
    };
    const result = formatAddress(address);
    expect(result).toBe('123 Main Street, London, Greater London, SW1A 1AA');
  });

  it('handles empty strings in fields', () => {
    const address: Address = {
      house_number: '',
      street_name: 'Main Street',
      city: 'London',
      county: '',
      postcode: 'SW1A 1AA'
    };
    const result = formatAddress(address);
    expect(result).toBe('Main Street, London, SW1A 1AA');
  });
});