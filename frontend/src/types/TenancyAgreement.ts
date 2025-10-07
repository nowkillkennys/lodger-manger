export interface Address {
  house_number?: string;
  street_name?: string;
  city?: string;
  county?: string;
  postcode?: string;
}

export interface LandlordDetails {
  name: string;
  address: Address;
  contactNumber: string;
  email: string;
}

export interface TenantDetails {
  name: string;
  currentAddress: Address;
  contactNumber: string;
  email: string;
  idVerification: string;
}

export interface PropertyDetails {
  address: Address;
  roomNumber?: string;
  includedAmenities: string[];
  sharedFacilities: string[];
}

export interface TenancyAgreement {
  agreementId: string;
  startDate: Date;
  landlordDetails: LandlordDetails;
  tenantDetails: TenantDetails;
  propertyDetails: PropertyDetails;
  rentAmount: number;
  rentPaymentFrequency: 'monthly' | 'weekly';
  paymentFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | '4-weekly';
  paymentType: 'cycle' | 'calendar';
  paymentDayOfMonth?: number;
  depositAmount: number;
  paymentMethod: string;
  noticePeriod: number;
  houseRules: string[];
  maintenanceTerms: string;
  utilitiesIncluded: string[];
  isSignedByLandlord: boolean;
  isSignedByTenant: boolean;
  signedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default TenancyAgreement;