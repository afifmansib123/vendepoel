// src/lib/models/Property.js
import mongoose from 'mongoose';
import { HighlightEnum, AmenityEnum, PropertyTypeEnum } from './Enums.js'; // Assuming Enums.js is in the same directory

const PropertySchema = new mongoose.Schema({
  // Field from your existing dummy data, to store the numeric ID
  id: {
    type: Number,
    // If this numeric 'id' is unique and you might query by it directly:
    // unique: true, // Be cautious if it's not truly unique across all potential data sources
    index: true,  // Good if you query by this numeric id
  },
  name: {
    type: String,
    required: [true, 'Property name is required.'],
  },
  description: {
    type: String,
    required: [true, 'Description is required.'],
  },
  pricePerMonth: {
    type: Number,
    required: [true, 'Price per month is required.'],
  },
  securityDeposit: {
    type: Number,
    required: [true, 'Security deposit is required.'],
  },
  applicationFee: {
    type: Number,
    required: [true, 'Application fee is required.'],
  },
  photoUrls: {
    type: [String],
    default: [],
  },
  amenities: {
    type: [{
      type: String,
      enum: AmenityEnum, // Make sure AmenityEnum is correctly defined and imported
    }],
    default: [],
  },
  highlights: {
    type: [{
      type: String,
      enum: HighlightEnum, // Make sure HighlightEnum is correctly defined and imported
    }],
    default: [],
  },
  isPetsAllowed: {
    type: Boolean,
    default: false,
  },
  isParkingIncluded: {
    type: Boolean,
    default: false,
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
  propertyType: {
    type: String,
    enum: PropertyTypeEnum, // Make sure PropertyTypeEnum is correctly defined and imported
    required: [true, 'Property type is required.'],
  },
  postedDate: {
    type: Date, // Mongoose will parse the ISO string date from your JSON
    default: Date.now,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  numberOfReviews: {
    type: Number,
    default: 0,
  },
  // --- Fields adjusted to match your existing JSON data structure ---
  locationId: {
    type: Number, // Corresponds to 'locationId' in your dummy data
    // required: true, // Make this required if every property MUST have a locationId
    index: true,    // Good if you query by locationId
  },
  managerCognitoId: {
    type: String, // Corresponds to 'managerCognitoId' in your dummy data
    // required: true, // Make this required if every property MUST have a managerCognitoId
    index: true,    // Good if you query by managerCognitoId
  },
  // --- End of adjusted fields ---

  // These M-M relationships likely don't exist in your current flat dummy data's root level.
  // They will be empty arrays when fetching existing data unless your dummy data for properties
  // explicitly includes arrays of tenant ObjectIds for 'favoritedBy' or 'tenants'.
  // For now, the schema defines them for future use with proper ObjectId refs.
  favoritedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
  }],
  tenants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
  }],
}, {
  timestamps: true, // Adds createdAt and updatedAt
  // **IMPORTANT**: If your MongoDB collection name is not 'properties' (lowercase plural of 'Property'),
  // specify it here. For example, if your collection is named 'property_data':
  // collection: 'property_data'
});

// Index for common search/filter fields
PropertySchema.index({ propertyType: 1, pricePerMonth: 1, beds: 1, baths: 1 });
// Indexes for the foreign key fields (as they exist in your dummy data)
// PropertySchema.index({ managerCognitoId: 1 }); // Already added above with 'index: true'
// PropertySchema.index({ locationId: 1 }); // Already added above with 'index: true'

// Ensure Mongoose doesn't redeclare the model if it already exists (HMR in Next.js)
export default mongoose.models.Property || mongoose.model('Property', PropertySchema);