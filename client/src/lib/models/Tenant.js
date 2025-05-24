// src/lib/models/Tenant.js
import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
  // Field from your existing dummy data, to store the numeric ID
  id: {
    type: Number,
    index: true, // Good if you query by this numeric id
  },
  cognitoId: {
    type: String,
    unique: true,
    required: [true, 'Cognito ID is required.'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required.'],
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    // You might want to add a unique index if emails should be unique across tenants
    // unique: true,
    // match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required.'],
  },

  // For existing data with {"connect": [{"id": X}]}, Mongoose will try to cast.
  // If the data in MongoDB for 'properties' is an object like {"connect": [...]},
  // this field might be null or empty when fetched by Mongoose directly as [Number].
  // However, if you later transform your data to store properties: [5, 6], this schema will work.
  // These fields store the numeric `id` of the related Property documents.
  properties: {
    type: [Number], // Expects an array of Property IDs (numeric)
    default: [],
    // ref: 'Property', // Cannot use 'ref' with Number type for Mongoose population
                       // We'll handle "joins" manually or migrate to ObjectIds later.
  },
  favorites: {
    type: [Number], // Expects an array of Property IDs (numeric)
    default: [],
    // ref: 'Property', // Cannot use 'ref' with Number type for Mongoose population
  },

  // Applications and leases will be queried from their respective collections.
  // If your tenant dummy data has fields like 'applicationIds: [1, 2]' or 'leaseIds: [3, 4]',
  // we would add them here as [Number] as well.
}, {
  timestamps: true,
  // IMPORTANT: If your MongoDB collection name is not 'tenants', specify it:
  // collection: 'tenant_data'
});

// Index for efficient querying by properties or favorites if needed (less common for arrays of numbers)
// TenantSchema.index({ properties: 1 });
// TenantSchema.index({ favorites: 1 });

export default mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);