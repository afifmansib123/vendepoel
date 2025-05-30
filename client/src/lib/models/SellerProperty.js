// lib/models/SellerProperty.ts
import mongoose from 'mongoose';

// No need for PropertyTypeEnum, PropertySaleStatusEnumArray, AmenityEnum, HighlightEnum here
// if we are not enforcing them in the schema.

const SellerPropertySchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true,
    // unique: true, // Consider if needed and how to manage if frontend pre-fills could cause collisions
  },
  name: {
    type: String,
    required: [true, 'Property name is required.'], // Mongoose validation still applies
  },
  description: {
    type: String,
    required: [true, 'Description is required.'],
  },
  salePrice: {
    type: Number,
    required: [true, 'Sale price is required.'],
  },
  propertyType: { // Now just a String
    type: String,
    required: [true, 'Property type is required.'],
  },
  propertyStatus: { // Now just a String
    type: String,
    default: 'For Sale', // Default still useful
    required: true,
  },
  beds: {
    type: Number,
    required: [true, 'Number of beds is required.'],
  },
  baths: {
    type: Number,
    required: [true, 'Number of baths is required.'],
  },
  squareFeet: {
    type: Number,
    required: [true, 'Square footage is required.'],
  },
  yearBuilt: {
    type: Number, // Optional
  },
  HOAFees: {
    type: Number, // Optional
  },
  photoUrls: {
    type: [String],
    default: [],
  },
  agreementDocumentUrl: {
    type: String, // Optional
  },
  amenities: { // Now just an array of Strings
    type: [String],
    default: [],
  },
  highlights: { // Now just an array of Strings
    type: [String],
    default: [],
  },
  openHouseDates: {
    type: [String], // Storing as an array of strings as per frontend processing
    default: [],
  },
  sellerNotes: {
    type: String, // Optional
  },
  allowBuyerApplications: {
    type: Boolean,
    default: true,
  },
  buyerInquiries: [{
    buyerCognitoId: { type: String }, // Basic structure
    message: String,
    inquiredAt: { type: Date, default: Date.now },
  }],
  preferredFinancingInfo: {
    type: String, // Optional
  },
  insuranceRecommendation: {
    type: String, // Optional
  },
  locationId: {
    type: Number,
    required: true,
    index: true,
  },
  sellerCognitoId: {
    type: String,
    required: true,
    index: true,
  },
  postedDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Indexes (still useful for querying)
SellerPropertySchema.index({ propertyType: 1, salePrice: 1, propertyStatus: 1 });
SellerPropertySchema.index({ sellerCognitoId: 1, propertyStatus: 1 });

export default mongoose.models.SellerProperty || mongoose.model('SellerProperty', SellerPropertySchema);