// src/lib/models/Payment.js
import mongoose from 'mongoose';
import { PaymentStatusEnum } from './Enums.js'; // Make sure Enums.js is in the same directory or path is correct

const PaymentSchema = new mongoose.Schema({
  // No 'id: Number' field here, assuming your Payment dummy data doesn't have it.
  // MongoDB will assign an _id (ObjectId) automatically.
  amountDue: {
    type: Number,
    required: [true, 'Amount due is required.'],
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  dueDate: {
    type: Date, // Mongoose will parse the ISO string date
    required: [true, 'Due date is required.'],
  },
  paymentDate: { // The date the payment was actually made
    type: Date, // Mongoose will parse the ISO string date
  },
  paymentStatus: {
    type: String,
    enum: PaymentStatusEnum, // Ensure PaymentStatusEnum is correctly defined and imported
    required: [true, 'Payment status is required.'],
    default: 'Pending', // Default if not provided in the data
  },

  // --- Field adjusted to handle existing JSON data structure for lease ---
  // For existing data with lease: {"connect": {"id": X}}, Mongoose will try to cast.
  // If the data in MongoDB for 'lease' is an object like {"connect": ...},
  // this field might be null when fetched by Mongoose directly as Number.
  // Ideally, this field in MongoDB should store just the numeric ID of the lease: leaseId: 1
  leaseId: { // Stores the numeric `id` of the related Lease document
    type: Number,
    // required: true, // If every payment must be linked to a lease
    index: true,    // Good if you query payments by leaseId
  },
  // The original 'lease' field with ObjectId ref is commented out for now.
  // lease: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Lease',
  //   required: true,
  // },
  // --- End of adjusted field ---

}, {
  timestamps: true, // Adds createdAt and updatedAt
  // IMPORTANT: If your MongoDB collection name is not 'payments', specify it:
  // collection: 'payment_records'
});

// Index for common query patterns
PaymentSchema.index({ leaseId: 1, dueDate: 1 }); // Using leaseId (Number)
PaymentSchema.index({ paymentStatus: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);