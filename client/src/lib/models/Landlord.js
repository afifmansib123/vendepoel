// src/lib/models/Manager.js
import mongoose from 'mongoose';

const LandlordSchema = new mongoose.Schema({
  // Field from your existing dummy data, to store the numeric ID
  id: {
    type: Number,
    // unique: true, // If this numeric 'id' is guaranteed to be unique
    index: true,  // Good if you query by this numeric id
  },
  cognitoId: {
    type: String,
    unique: true, // Cognito IDs should be unique
    required: [true, 'Cognito ID is required.'],
    index: true,  // Essential for quick lookups by Cognito ID
  },
  name: {
    type: String,
    required: [true, 'Name is required.'],
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    // If emails should be unique across all managers, uncomment the next line:
    // unique: true,
    // Consider adding email format validation if needed:
    // match: [/.+\@.+\..+/, 'Please provide a valid email address'],
  },
  phoneNumber: {
    type: String,
    required: [false, 'Phone number is not required.'],
  },
  // `managedProperties` is not stored directly on the Manager document.
  // It's a "virtual" relationship derived by querying Properties.
  // For example: Property.find({ managerCognitoId: aManager.cognitoId })
  // Or, once migrated to ObjectIds: Property.find({ manager: aManager._id })
}, {
  timestamps: true, // Adds createdAt and updatedAt
  // IMPORTANT: If your MongoDB collection name is not 'managers', specify it:
  // collection: 'manager_profiles'
});

export default mongoose.models.Landlord || mongoose.model('Landlord', LandlordSchema);