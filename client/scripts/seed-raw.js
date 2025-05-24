// scripts/seed-raw.js
// This script seeds data "as-is" from JSON files, using the Mongoose schemas
// that were adjusted to match the JSON structure.

require('dotenv').config({ path: '.env' }); // For MONGODB_URI
const fs = require('node:fs'); // Use node:fs for clarity
const path = require('node:path');
const mongoose = require('mongoose');

// --- IMPORTANT: Configure Mongoose to be less strict for seeding "as-is" data ---
// If your schemas have fields defined that are NOT in your JSON, Mongoose
// by default will not include them. If fields in JSON are NOT in schema,
// they will be stripped out unless strict is false.
// For "as-is" seeding, we might want to be more lenient initially,
// or ensure schemas perfectly match JSON.
// Let's assume schemas are adjusted to largely match the JSON.
// mongoose.set('strictQuery', false); // For queries, less relevant for inserts
// mongoose.set('strict', false); // For inserts: if true (default), paths not in schema are stripped.
                                // If false, they are saved. Let's keep it true for now
                                // and rely on schemas matching JSON.

// --- Path Configuration ---
// Assuming this script is in project_root/scripts/ and models are in project_root/src/lib/models/
// Adjust these paths if your script or models are located elsewhere.
const modelsBasePath = path.join(__dirname, '..', 'src', 'lib', 'models');
const seedDataPath = path.join(__dirname, '..', 'src', 'seedData');

// --- Dynamically load models ---
// Note: .default is needed because models are exported using 'export default'
const Application = require(path.join(modelsBasePath, 'Application.js')).default;
const Lease = require(path.join(modelsBasePath, 'Lease.js')).default;
const Location = require(path.join(modelsBasePath, 'Location.js')).default;
const Manager = require(path.join(modelsBasePath, 'Manager.js')).default;
const Payment = require(path.join(modelsBasePath, 'Payment.js')).default;
const Property = require(path.join(modelsBasePath, 'Property.js')).default;
const Tenant = require(path.join(modelsBasePath, 'Tenant.js')).default;

const MONGODB_URI = process.env.MONGODB_URI;

function loadSeedData(fileName) {
  const filePath = path.join(seedDataPath, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Seed data file not found: ${filePath}`);
    process.exit(1);
  }
  try {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (err) {
    console.error(`❌ Error parsing JSON from ${filePath}:`, err);
    process.exit(1);
  }
}

// Mapping for model names to Mongoose models and their JSON file names
const modelSeedConfig = [
  { modelName: 'Location', MongooseModel: Location, fileName: 'locations.json' },
  { modelName: 'Manager', MongooseModel: Manager, fileName: 'managers.json' },
  { modelName: 'Tenant', MongooseModel: Tenant, fileName: 'tenants.json' }, // Seed tenants before properties that might reference them via favorites/properties (if transformed)
  { modelName: 'Property', MongooseModel: Property, fileName: 'properties.json' },
  { modelName: 'Lease', MongooseModel: Lease, fileName: 'leases.json' },
  { modelName: 'Application', MongooseModel: Application, fileName: 'applications.json' },
  { modelName: 'Payment', MongooseModel: Payment, fileName: 'payments.json' },
];


async function seedDatabase() {
  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in .env.local. Please set it.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected for seeding...');

    console.log('🗑️ Clearing existing data for relevant collections...');
    for (const config of modelSeedConfig) {
      await config.MongooseModel.deleteMany({});
      console.log(`   Cleared ${config.modelName} collection.`);
    }
    console.log('✅ Existing data cleared.');

    for (const config of modelSeedConfig) {
      console.log(`🌱 Seeding ${config.modelName}...`);
      const dataToSeed = loadSeedData(config.fileName);

      if (!dataToSeed || dataToSeed.length === 0) {
        console.log(`   No data to seed for ${config.modelName}. Skipping.`);
        continue;
      }

      // For "Location" coordinates specifically:
      // If your LocationSchema expects GeoJSON but JSON has WKT, Mongoose will try to cast.
      // It will likely fail to cast "POINT(...)" string to the {type, coordinates} object.
      // The 'coordinates' field in MongoDB might end up null or empty.
      // If your LocationSchema was adjusted to store `coordinates: String`, then it's fine.
      // Let's assume for Location, the schema expects GeoJSON and we acknowledge the WKT issue.

      // For "Tenant" properties/favorites and "Payment" lease (fields with `{"connect": ...}`):
      // If your Mongoose schema for Tenant expects `properties: [Number]` but data has `properties: {"connect": ...}`,
      // Mongoose will try to cast. It will likely fail, resulting in `properties` being null/empty.
      // If your schema was adjusted to perfectly match `properties: { connect: [{id: Number}] }`, then it's fine.
      // Let's assume schemas were adjusted to expect the simpler [Number] or just Number for these relational IDs.

      try {
        // Using insertMany for efficiency, but ensure data objects align with schema.
        // Mongoose will apply schema defaults and validation.
        await config.MongooseModel.insertMany(dataToSeed, { ordered: false }); // ordered:false continues on error
        console.log(`   ✅ Seeded ${dataToSeed.length} documents into ${config.modelName}.`);
      } catch (e) {
        console.error(`   ❌ Error seeding ${config.modelName}:`, e);
        // If e.writeErrors is available, log individual errors
        if (e.writeErrors) {
          e.writeErrors.forEach(err => console.error('      Individual error:', err.err.errmsg));
        }
      }
    }

    console.log('🎉 Database seeded successfully with "as-is" data!');

  } catch (error) {
    console.error('❌ Global error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected.');
  }
}

seedDatabase();