/**
 * Parse a free-text address into structured components
 * This is a best-effort parser for UK addresses
 * @param {string} addressString - The address string to parse
 * @returns {object} Parsed address components
 */
function parseAddress(addressString) {
  if (!addressString || typeof addressString !== 'string') {
    return {
      house_number: null,
      street_name: null,
      city: null,
      county: null,
      postcode: null
    };
  }

  const address = addressString.trim();

  // Extract postcode (UK format: e.g., SW1A 1AA, M1 1AA, etc.)
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
  const postcodeMatch = address.match(postcodeRegex);
  let postcode = null;
  let addressWithoutPostcode = address;

  if (postcodeMatch) {
    postcode = postcodeMatch[1].toUpperCase();
    addressWithoutPostcode = address.replace(postcodeMatch[0], '').trim();
  }

  // Split by commas to get address components
  const parts = addressWithoutPostcode.split(',').map(p => p.trim()).filter(p => p);

  let house_number = null;
  let street_name = null;
  let city = null;
  let county = null;

  if (parts.length >= 1) {
    // First part usually contains house number and street
    const firstPart = parts[0];
    const houseNumberMatch = firstPart.match(/^(\d+[A-Z]?)\s+(.+)/);

    if (houseNumberMatch) {
      house_number = houseNumberMatch[1];
      street_name = houseNumberMatch[2];
    } else {
      street_name = firstPart;
    }
  }

  if (parts.length >= 2) {
    city = parts[1];
  }

  if (parts.length >= 3) {
    county = parts[2];
  }

  return {
    house_number,
    street_name,
    city,
    county,
    postcode
  };
}

module.exports = { parseAddress };
