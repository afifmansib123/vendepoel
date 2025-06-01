// src/types/sellerMarketplaceTypes.ts

// Matches the API response for GET /api/seller-properties and GET /api/seller-properties/[id]

export interface SellerPropertyLocationCoordinates {
  longitude: number;
  latitude: number;
}

export interface SellerPropertyLocation {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: SellerPropertyLocationCoordinates | null;
}

export interface SellerProperty { // Renamed from SellerPropertyFromAPI to avoid potential naming conflicts
  _id: string;
  id: number; // Numeric ID
  name: string;
  description: string;
  salePrice: number;
  propertyType: string;
  propertyStatus: string;
  beds: number;
  baths: number;
  squareFeet: number;
  yearBuilt?: number | null;
  HOAFees?: number | null;
  amenities: string[];
  highlights: string[];
  openHouseDates?: string[];
  sellerNotes?: string;
  allowBuyerApplications: boolean;
  preferredFinancingInfo?: string;
  insuranceRecommendation?: string;
  sellerCognitoId: string;
  photoUrls: string[];
  agreementDocumentUrl?: string;
  location: SellerPropertyLocation;
  postedDate: string; // Date as string
  createdAt: string;  // Date as string
  updatedAt: string;  // Date as string
  buyerInquiries?: any[];
}

// For managing filter state within the seller-marketplace page
export interface SellerMarketplaceFilters {
  location: string; // Text search for location
  coordinates: [number, number] | null; // [lng, lat]
  salePriceRange: [number | null, number | null];
  propertyType: string | null; // e.g., 'SingleFamily', 'Condo', or null for 'any'
  beds: string | null; // e.g., '1', '2', or null for 'any beds' (representing minimum)
  // Add other simple filters if needed, e.g., baths
  [key: string]: any; // For flexibility with URL params
}

export const initialSellerMarketplaceFilters: SellerMarketplaceFilters = {
  location: "",
  coordinates: null,
  salePriceRange: [null, null],
  propertyType: null, // 'any'
  beds: null,         // 'any'
};

// Helper to clean filter objects, removing null/empty/default values for cleaner URLs
export const cleanSellerFiltersForURL = (filters: SellerMarketplaceFilters): Record<string, string> => {
  const cleaned: Record<string, string> = {};
  if (filters.location) cleaned.location = filters.location;
  if (filters.coordinates) cleaned.coordinates = filters.coordinates.join(',');
  if (filters.salePriceRange && (filters.salePriceRange[0] !== null || filters.salePriceRange[1] !== null)) {
    cleaned.salePriceRange = `${filters.salePriceRange[0] === null ? '' : filters.salePriceRange[0]},${filters.salePriceRange[1] === null ? '' : filters.salePriceRange[1]}`;
  }
  if (filters.propertyType && filters.propertyType !== 'any') cleaned.propertyType = filters.propertyType;
  if (filters.beds && filters.beds !== 'any') cleaned.beds = filters.beds;
  return cleaned;
};