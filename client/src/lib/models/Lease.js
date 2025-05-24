// src/lib/models/Lease.js
import mongoose from 'mongoose';

const LeaseSchema = new mongoose.Schema({
  // Field from your existing dummy data, to store the numeric ID for the lease itself
  id: {
    type: Number,
    // unique: true, // If this numeric 'id' is guaranteed to be unique for leases
    index: true,  // Good if you query by this numeric lease id
  },
  startDate: {
    type: Date, // Mongoose will parse the ISO string
    required: [true, 'Lease start date is required.'],
  },
  endDate: {
    type: Date, // Mongoose will parse the ISO string
    required: [true, 'Lease end date is required.'],
  },
  rent: {
    type: Number,
    required: [true, 'Rent amount is required.'],
  },
  deposit: {
    type: Number,
    required: [true, 'Deposit amount is required.'],
  },

  // --- Fields adjusted to match your existing JSON data structure ---
  propertyId: { // Corresponds to 'propertyId' in your dummy data (numeric Property ID)
    type: Number,
    // required: true, // If every lease must link to a property
    index: true,    // Good if you query leases by propertyId
  },
  tenantCognitoId: { // Corresponds to 'tenantCognitoId' in your dummy data (string Tenant Cognito ID)
    type: String,
    // required: true, // If every lease must link to a tenant
    index: true,    // Good if you query leases by tenantCognitoId
  },
  // --- End of adjusted fields ---

  // Original ObjectId refs commented out for this phase:
  // property: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Property',
  //   required: true,
  // },
  // tenant: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Tenant',
  //   required: true,
  // },

  // The link to Application:
  // If your Lease dummy data contains an 'applicationId' (numeric), add it here:
  // applicationId: {
  //   type: Number,
  //   index: true,
  //   unique: true, // If one application leads to one lease
  //   sparse: true  // If unique and optional
  // },
  // Otherwise, if the link is on the Application model pointing to a Lease (e.g. Application.leaseId),
  // then no direct field is needed here for that specific link.

  // Payments are typically linked from the Payment model (Payment.leaseId)
}, {
  timestamps: true, // Adds createdAt and updatedAt
  // IMPORTANT: If your MongoDB collection name is not 'leases', specify it:
  // collection: 'lease_agreements'
});

// Indexes using the adjusted field names
LeaseSchema.index({ propertyId: 1, tenantCognitoId: 1 }); // For finding leases by property or tenant
LeaseSchema.index({ startDate: 1, endDate: 1 });     // For date-range queries

// Validate that endDate is after startDate
LeaseSchema.path('endDate').validate(function (value) {
  // Ensure startDate is also present and valid for comparison
  if (this.startDate && value) {
    return this.startDate < value;
  }
  return true; // Or false if both must be present for validation
}, 'End date must be after start date.');

export default mongoose.models.Lease || mongoose.model('Lease', LeaseSchema);