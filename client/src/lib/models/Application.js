// src/lib/models/Application.js
import mongoose from 'mongoose';
import { ApplicationStatusEnum } from './Enums.js'; // Ensure Enums.js is in the same dir or path is correct

const ApplicationSchema = new mongoose.Schema({
  // Field from your existing dummy data, for the application's own numeric ID
  id: {
    type: Number,
    // unique: true, // If this numeric 'id' is guaranteed to be unique for applications
    index: true,  // Good if you query by this numeric application id
  },
  applicationDate: {
    type: Date, // Mongoose will parse the ISO string
    default: Date.now,
    // required: true, // Your JSON data always provides it
  },
  status: {
    type: String,
    enum: ApplicationStatusEnum, // Ensure ApplicationStatusEnum is correctly defined
    required: [true, 'Application status is required.'],
    default: 'Pending',
  },

  // --- Fields adjusted to match your existing JSON data structure ---
  propertyId: { // Corresponds to 'propertyId' in your dummy data (numeric Property ID)
    type: Number,
    // required: true, // If every application must link to a property
    index: true,
  },
  tenantCognitoId: { // Corresponds to 'tenantCognitoId' in your dummy data (string Tenant Cognito ID)
    type: String,
    // required: true, // If every application must link to a tenant
    index: true,
  },
  leaseId: { // Corresponds to 'leaseId' in your dummy data (numeric Lease ID, optional)
    type: Number,
    unique: true,   // If a lease can only originate from one application
    sparse: true,   // Necessary for unique index on an optional field (allows many nulls)
    default: null,  // Explicitly set default to null if not provided
    index: true,    // Good to index if you look up applications by leaseId
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
  // lease: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Lease',
  //   unique: true,
  //   sparse: true,
  //   default: null,
  // },

  // Applicant details (snapshot at time of application)
  name: {
    type: String,
    required: [true, "Applicant's name is required."],
  },
  email: {
    type: String,
    required: [true, "Applicant's email is required."],
  },
  phoneNumber: {
    type: String,
    required: [true, "Applicant's phone number is required."],
  },
  message: {
    type: String, // Optional message
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  // IMPORTANT: If your MongoDB collection name is not 'applications', specify it:
  // collection: 'rental_applications'
});

// Indexes using the adjusted field names
ApplicationSchema.index({ propertyId: 1, tenantCognitoId: 1 });
ApplicationSchema.index({ status: 1 });
// ApplicationSchema.index({ leaseId: 1 }); // Already added with 'index: true' above

export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);