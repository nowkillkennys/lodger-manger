export interface LandlordDetails {
  name: string;
  address: string;
  contactNumber: string;
  email: string;
}

export interface TenantDetails {
  name: string;
  currentAddress: string;
  contactNumber: string;
  email: string;
  idVerification: string;
}

export interface PropertyDetails {
  address: string;
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