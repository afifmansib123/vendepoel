// src/lib/models/Enums.js

export const HighlightEnum = [
  'HighSpeedInternetAccess',
  'WasherDryer', // Note: 'WasherDryer' is also in AmenityEnum, ensure this is intended
  'AirConditioning',
  'Heating',
  'SmokeFree',
  'CableReady',
  'SatelliteTV',
  'DoubleVanities',
  'TubShower',
  'Intercom',
  'SprinklerSystem',
  'RecentlyRenovated',
  'CloseToTransit',
  'GreatView',
  'QuietNeighborhood',
];

export const AmenityEnum = [
  'WasherDryer',
  'AirConditioning',
  'Dishwasher',
  'HighSpeedInternet',
  'HardwoodFloors',
  'WalkInClosets',
  'Microwave',
  'Refrigerator',
  'Pool',
  'Gym',
  'Parking',
  'PetsAllowed',
  'WiFi',
];

// This PropertyTypeEnum is used for the SellerProperty model
// and the "List Your Property for Sale" frontend page.
export const PropertyTypeEnum = [
  'Rooms',
  'Tinyhouse',
  'Apartment',
  'Villa',
  'Townhouse',
  'Cottage',
  // You might consider adding more sale-specific types here if needed,
  // e.g., 'SingleFamilyHome', 'Condo', 'Land', 'CommercialBuilding'
  // but the current ones will work with the previous code.
];

// --- ADDED ENUM for Seller Properties ---
export const PropertySaleStatusEnumArray = [
  'For Sale',
  'Sale Pending',
  'Sold',
  'Coming Soon',
  'Off Market',
];
// --------------------------------------

// These enums were in your original file and are kept.
// They were not directly used in the SellerProperty creation flow I provided,
// but are preserved as they might be used elsewhere in your application.
export const ApplicationStatusEnum = [
  'Pending',
  'Denied',
  'Approved',
];

export const PaymentStatusEnum = [
  'Pending',
  'Paid',
  'PartiallyPaid',
  'Overdue',
];