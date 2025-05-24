// src/app/api/seed/route.js
import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import dbConnect from '@/lib/dbConnect'; // Assuming @ alias

import Tenant from '@/lib/models/Tenant'; // Only importing Tenant model

// Configuration for seeding - ONLY TENANT
const modelSeedConfig = [
  { modelName: 'Tenant', MongooseModel: Tenant, fileName: 'tenant.json' },
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
        throw parseOrReadError; // Re-throw to be caught by the main logic
    }
}

export async function GET(request) {
  const logs = [];
  logs.push(`Seeding process started for TENANT ONLY (ONE-BY-ONE with pre-processing). NODE_ENV: ${process.env.NODE_ENV}`);
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
  const projectRoot = process.cwd();
  const seedDataDirRoot = path.join(projectRoot, 'src', 'seedData');

  try {
    await dbConnect();
    logs.push('✅ MongoDB connected for seeding...');

    // Clear ONLY the Tenant collection
    logs.push('🗑️ Clearing existing Tenant data...');
    try {
      await Tenant.deleteMany({});
      logs.push(`   Cleared Tenant collection.`);
    } catch (e) {
      logs.push(`   ❌ Error clearing Tenant: ${e.message}`);
      // overallSuccess = false; // Decide if this should halt everything
    }
    logs.push('✅ Existing Tenant data cleared (or attempted).');


    // This loop will only run once for Tenant based on modelSeedConfig
    for (const config of modelSeedConfig) {
      logs.push(`🌱 Processing ${config.modelName} from file: ${config.fileName}`);
      const filePath = path.join(seedDataDirRoot, config.fileName);
      let dataToSeedFromJson; // Raw data from JSON

      try {
        // Check file existence before reading
        await fs.access(filePath, fs.constants.R_OK);
        logs.push(`   ✅ File exists and is readable: ${filePath}`);
        dataToSeedFromJson = await readAndParseJSON(filePath, logs);
      } catch (fileError) {
        logs.push(`   ❌ Error loading or accessing file ${filePath}: ${fileError.message}`);
        overallSuccess = false;
        continue; // Skip to next in modelSeedConfig (though there's only one)
      }

      if (!dataToSeedFromJson || !Array.isArray(dataToSeedFromJson) || dataToSeedFromJson.length === 0) {
        logs.push(`   ⚠️ No data, not an array, or empty array in ${config.fileName}. Skipping insert for ${config.modelName}.`);
        continue;
      }

      // --- Insert one by one with pre-processing ---
      logs.push(`   Attempting to insert ${dataToSeedFromJson.length} tenant documents one by one with pre-processing...`);
      let successfullyInsertedCount = 0;
      for (let i = 0; i < dataToSeedFromJson.length; i++) {
        const originalTenantDocData = dataToSeedFromJson[i]; // Data from JSON

        // ---- START PRE-PROCESSING ----
        const processedTenantDocData = {
          ...originalTenantDocData, // Copy all other fields (id, cognitoId, name, email, etc.)
        };

        // Transform 'properties'
        if (originalTenantDocData.properties && originalTenantDocData.properties.connect && Array.isArray(originalTenantDocData.properties.connect)) {
          processedTenantDocData.properties = originalTenantDocData.properties.connect.map(item => item.id).filter(id => typeof id === 'number');
          logs.push(`      Processed properties for JSON ID ${originalTenantDocData.id || 'N/A'}: ${JSON.stringify(processedTenantDocData.properties)}`);
        } else {
          processedTenantDocData.properties = []; // Default to empty array if not in expected format
          logs.push(`      Defaulted properties for JSON ID ${originalTenantDocData.id || 'N/A'} to []`);
        }

        // Transform 'favorites'
        if (originalTenantDocData.favorites && originalTenantDocData.favorites.connect && Array.isArray(originalTenantDocData.favorites.connect)) {
          processedTenantDocData.favorites = originalTenantDocData.favorites.connect.map(item => item.id).filter(id => typeof id === 'number');
          logs.push(`      Processed favorites for JSON ID ${originalTenantDocData.id || 'N/A'}: ${JSON.stringify(processedTenantDocData.favorites)}`);
        } else {
          processedTenantDocData.favorites = []; // Default to empty array
          logs.push(`      Defaulted favorites for JSON ID ${originalTenantDocData.id || 'N/A'} to []`);
        }
        // ---- END PRE-PROCESSING ----

        logs.push(`      Attempting to save processed tenant JSON ID: ${processedTenantDocData.id || 'N/A'}, Name: ${processedTenantDocData.name || 'N/A'}`);
        try {
          const tenant = new Tenant(processedTenantDocData); // Use the processed data
          await tenant.save();
          logs.push(`         ✅ Inserted tenant JSON ID: ${processedTenantDocData.id || 'N/A'}. New DB _id: ${tenant._id}`);
          successfullyInsertedCount++;
        } catch (singleDbError) {
          logs.push(`         ❌ FAILED to insert tenant JSON ID: ${processedTenantDocData.id || 'N/A'}. Error: ${singleDbError.message}`);
          if (singleDbError.errors) {
            for (const fieldName in singleDbError.errors) {
                logs.push(`            Validation Error on path '${singleDbError.errors[fieldName].path}': ${singleDbError.errors[fieldName].message}`);
            }
          }
          overallSuccess = false;
        }
      }
      logs.push(`   Finished one-by-one insert. Successfully inserted: ${successfullyInsertedCount}/${dataToSeedFromJson.length}`);
      // --- End one-by-one insert ---
    }


    if (overallSuccess && successfullyInsertedCount === (dataToSeedFromJson ? dataToSeedFromJson.length : 0) ) {
      logs.push('🎉 Tenant seeding completed successfully!');
      return NextResponse.json({ success: true, message: 'Tenant seeding completed successfully!', logs });
    } else {
      logs.push('⚠️ Tenant seeding completed with one or more errors or not all documents inserted.');
      return NextResponse.json({ success: false, message: 'Tenant seeding completed with errors or incomplete.', logs }, {status: 500});
    }

  } catch (globalError) {
    console.error('❌ Global error during Tenant seeding API call:', globalError);
    logs.push(`❌ GLOBAL ERROR: ${globalError.message}`);
    return NextResponse.json({ success: false, message: 'A critical error occurred during Tenant seeding.', error: globalError.toString(), logs }, { status: 500 });
  }
}