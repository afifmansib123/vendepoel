// src/lib/models/Location.js
import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  // Field from your existing dummy data, to store the numeric ID
  id: {
    type: Number,
    // unique: true, // If this numeric 'id' is guaranteed to be unique
    index: true,  // Good if you query by this numeric id
  },
  address: {
    type: String,
    required: [true, 'Address is required.'],
  },
  city: {
    type: String,
    required: [true, 'City is required.'],
  },
  state: {
    type: String,
    required: [true, 'State is required.'],
  },
  country: {
    type: String,
    required: [true, 'Country is required.'],
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required.'],
  },
  // This field expects GeoJSON. Your current data is WKT string.
  // Mongoose will likely store null or fail validation for this field
  // when reading your current WKT data directly into this GeoJSON structure
  // without a transformation step or a custom setter.
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      // required: true, // Temporarily make not required if WKT string causes validation fail
    },
    coordinates: { // [longitude, latitude]
      type: [Number],
      // required: true, // Temporarily make not required
    },
  },
  // --- Alternative for strictly reading WKT string AS IS ---
  // If you want to store the WKT string directly for now and parse later:
  /*
  coordinatesWKT: {
    type: String, // Stores "POINT(-118.144516 34.147785)"
  },
  */
  // Then you'd populate the GeoJSON 'coordinates' field via a script or setter.
}, {
  timestamps: true,
  // IMPORTANT: If your MongoDB collection name is not 'locations', specify it:
  // collection: 'location_data'
});

// Create a 2dsphere index IF the 'coordinates' field successfully stores GeoJSON.
// If 'coordinates' is null due to WKT string, this index won't be effective on that field.
LocationSchema.index({ "coordinates": '2dsphere' });

export default mongoose.models.Location || mongoose.model('Location', LocationSchema);