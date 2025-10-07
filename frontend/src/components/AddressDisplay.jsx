import React from 'react';
import { formatAddress } from '../utils/addressUtils';

const AddressDisplay = ({ address, className = '', as = 'span' }) => {
  const formattedAddress = formatAddress(address);

  const Component = as;

  return (
    <Component className={className}>
      {formattedAddress}
    </Component>
  );
};

export default AddressDisplay;