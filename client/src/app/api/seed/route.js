// src/app/api/seed/route.js
import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import dbConnect from '@/lib/dbConnect';

// Import your models (adjust paths as needed)
import Application from '@/lib/models/Application';
import Lease from '@/lib/models/Lease';
import Location from '@/lib/models/Location';
import Manager from '@/lib/models/Manager';
import Payment from '@/lib/models/Payment';
import Property from '@/lib/models/Property';

// Model configuration for seeding (EXCLUDING Tenant - already seeded)  
const modelSeedConfig = [
  { modelName: 'Location', MongooseModel: Location, fileName: 'locations.json' },
  { modelName: 'Manager', MongooseModel: Manager, fileName: 'managers.json' },
  { modelName: 'Property', MongooseModel: Property, fileName: 'properties.json' },
  { modelName: 'Lease', MongooseModel: Lease, fileName: 'leases.json' },
  { modelName: 'Application', MongooseModel: Application, fileName: 'applications.json' },
  { modelName: 'Payment', MongooseModel: Payment, fileName: 'payments.json' },
];

// Helper function to load and parse JSON data
async function readAndParseJSON(filePath, logs) {
    logs.push(`   Attempting to read and parse: ${filePath}`);
    try {
        const jsonData = await fs.readFile(filePath, 'utf-8');
        logs.push(`   ✅ Successfully read file: ${filePath}`);
        const parsedData = JSON.parse(jsonData);
        logs.push(`   ✅ Successfully parsed JSON from: ${filePath}`);
        return parsedData;
    } catch (parseOrReadError) {
        logs.push(`   ❌ Error reading or parsing ${filePath}: ${parseOrReadError.message}`);
        throw parseOrReadError;
    }
}

export async function GET(request) {
  const logs = [];
  logs.push(`Seeding process started for ALL MODELS EXCEPT TENANT (already seeded). NODE_ENV: ${process.env.NODE_ENV}`);
  logs.push(`Current Working Directory (process.cwd()): ${process.cwd()}`);

  // Security check
  if (process.env.NODE_ENV !== 'development') {
    logs.push('🚫 Seeding aborted: Not in development environment.');
    return NextResponse.json(
      { success: false, message: 'Seeding is only allowed in development mode.', logs },
      { status: 403 }
    );
  }

  let overallSuccess = true;
  let totalSuccessfulInserts = 0;
  let totalAttemptedInserts = 0;
  const projectRoot = process.cwd();
  const seedDataDirRoot = path.join(projectRoot, 'src', 'seedData');

  try {
    await dbConnect();
    logs.push('✅ MongoDB connected for seeding...');

    // Clear existing data for all collections EXCEPT Tenant
    logs.push('🗑️ Clearing existing data for all collections (except Tenant)...');
    for (const config of modelSeedConfig) {
      try {
        await config.MongooseModel.deleteMany({});
        logs.push(`   Cleared ${config.modelName} collection.`);
      } catch (e) {
        logs.push(`   ❌ Error clearing ${config.modelName}: ${e.message}`);
        overallSuccess = false;
      }
    }
    logs.push('✅ Existing data cleared (or attempted).');

    // Process each model
    for (const config of modelSeedConfig) {
      logs.push(`🌱 Processing ${config.modelName} from file: ${config.fileName}`);
      const filePath = path.join(seedDataDirRoot, config.fileName);
      let dataToSeedFromJson;

      try {
        // Check file existence before reading
        await fs.access(filePath, fs.constants.R_OK);
        logs.push(`   ✅ File exists and is readable: ${filePath}`);
        dataToSeedFromJson = await readAndParseJSON(filePath, logs);
      } catch (fileError) {
        logs.push(`   ❌ Error loading or accessing file ${filePath}: ${fileError.message}`);
        overallSuccess = false;
        continue;
      }

      if (!dataToSeedFromJson || !Array.isArray(dataToSeedFromJson) || dataToSeedFromJson.length === 0) {
        logs.push(`   ⚠️ No data, not an array, or empty array in ${config.fileName}. Skipping insert for ${config.modelName}.`);
        continue;
      }

      // Insert one by one with pre-processing
      logs.push(`   Attempting to insert ${dataToSeedFromJson.length} ${config.modelName} documents one by one with pre-processing...`);
      let successfullyInsertedCount = 0;
      totalAttemptedInserts += dataToSeedFromJson.length;

      for (let i = 0; i < dataToSeedFromJson.length; i++) {
        const originalDocData = dataToSeedFromJson[i];

        // Pre-process the data based on model type
        const processedDocData = preprocessDocumentData(config.modelName, originalDocData, logs);

        logs.push(`      Attempting to save processed ${config.modelName} JSON ID: ${processedDocData.id || 'N/A'}`);
        try {
          const document = new config.MongooseModel(processedDocData);
          await document.save();
          logs.push(`         ✅ Inserted ${config.modelName} JSON ID: ${processedDocData.id || 'N/A'}. New DB _id: ${document._id}`);
          successfullyInsertedCount++;
        } catch (singleDbError) {
          logs.push(`         ❌ FAILED to insert ${config.modelName} JSON ID: ${processedDocData.id || 'N/A'}. Error: ${singleDbError.message}`);
          if (singleDbError.errors) {
            for (const fieldName in singleDbError.errors) {
              logs.push(`            Validation Error on path '${singleDbError.errors[fieldName].path}': ${singleDbError.errors[fieldName].message}`);
            }
          }
          overallSuccess = false;
        }
      }
      
      logs.push(`   Finished one-by-one insert for ${config.modelName}. Successfully inserted: ${successfullyInsertedCount}/${dataToSeedFromJson.length}`);
      totalSuccessfulInserts += successfullyInsertedCount;
    }

    if (overallSuccess && totalSuccessfulInserts === totalAttemptedInserts) {
      logs.push('🎉 All models seeding completed successfully!');
      return NextResponse.json({ 
        success: true, 
        message: 'All models seeding completed successfully!', 
        totalInserted: totalSuccessfulInserts,
        totalAttempted: totalAttemptedInserts,
        logs 
      });
    } else {
      logs.push('⚠️ Seeding completed with one or more errors or not all documents inserted.');
      return NextResponse.json({ 
        success: false, 
        message: 'Seeding completed with errors or incomplete.',
        totalInserted: totalSuccessfulInserts,
        totalAttempted: totalAttemptedInserts,
        logs 
      }, { status: 500 });
    }

  } catch (globalError) {
    console.error('❌ Global error during seeding API call:', globalError);
    logs.push(`❌ GLOBAL ERROR: ${globalError.message}`);
    return NextResponse.json({ 
      success: false, 
      message: 'A critical error occurred during seeding.', 
      error: globalError.toString(), 
      logs 
    }, { status: 500 });
  }
}

// Function to preprocess document data based on model type
function preprocessDocumentData(modelName, originalData, logs) {
  const processedData = { ...originalData };

  switch (modelName) {
    case 'Location':
      // Handle WKT to GeoJSON conversion if needed
      if (originalData.coordinates && typeof originalData.coordinates === 'string' && originalData.coordinates.startsWith('POINT')) {
        // Extract coordinates from WKT format "POINT(lng lat)"
        const coordMatch = originalData.coordinates.match(/POINT\(([^)]+)\)/);
        if (coordMatch) {
          const [lng, lat] = coordMatch[1].split(' ').map(Number);
          processedData.coordinates = {
            type: 'Point',
            coordinates: [lng, lat]
          };
          logs.push(`      Converted WKT to GeoJSON for Location ID ${originalData.id || 'N/A'}`);
        }
      }
      break;

    case 'Property':
      // Transform relational fields if they exist
      if (originalData.location && originalData.location.connect && originalData.location.connect.id) {
        processedData.location = originalData.location.connect.id;
        logs.push(`      Processed location for Property ID ${originalData.id || 'N/A'}: ${processedData.location}`);
      }
      if (originalData.manager && originalData.manager.connect && originalData.manager.connect.id) {
        processedData.manager = originalData.manager.connect.id;
        logs.push(`      Processed manager for Property ID ${originalData.id || 'N/A'}: ${processedData.manager}`);
      }
      break;

    case 'Lease':
      // Transform relational fields
      if (originalData.tenant && originalData.tenant.connect && originalData.tenant.connect.id) {
        processedData.tenant = originalData.tenant.connect.id;
        logs.push(`      Processed tenant for Lease ID ${originalData.id || 'N/A'}: ${processedData.tenant}`);
      }
      if (originalData.property && originalData.property.connect && originalData.property.connect.id) {
        processedData.property = originalData.property.connect.id;
        logs.push(`      Processed property for Lease ID ${originalData.id || 'N/A'}: ${processedData.property}`);
      }
      break;

    case 'Application':
      // Transform relational fields
      if (originalData.tenant && originalData.tenant.connect && originalData.tenant.connect.id) {
        processedData.tenant = originalData.tenant.connect.id;
        logs.push(`      Processed tenant for Application ID ${originalData.id || 'N/A'}: ${processedData.tenant}`);
      }
      if (originalData.property && originalData.property.connect && originalData.property.connect.id) {
        processedData.property = originalData.property.connect.id;
        logs.push(`      Processed property for Application ID ${originalData.id || 'N/A'}: ${processedData.property}`);
      }
      break;

    case 'Payment':
      // Transform lease relationship
      if (originalData.lease && originalData.lease.connect && originalData.lease.connect.id) {
        processedData.lease = originalData.lease.connect.id;
        logs.push(`      Processed lease for Payment ID ${originalData.id || 'N/A'}: ${processedData.lease}`);
      }
      break;

    case 'Manager':
      // No special preprocessing needed for Manager currently
      break;
  }

  return processedData;
}