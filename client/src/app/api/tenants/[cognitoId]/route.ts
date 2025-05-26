// src/app/api/tenants/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/lib/models/Tenant';     // Your Mongoose Tenant model
import Property from '@/lib/models/Property'; // Your Mongoose Property model

// --- START Standard Type Definitions ---

// Represents the structure of a Property document from the database (after .lean())
interface PropertyDocument {
  _id: Types.ObjectId | string; // Mongoose's default ObjectId, or string after serialization/lean
  id: number;                    // Custom numeric ID used for relations
  // Add other known fields from your Property schema if available, e.g.:
  // address?: string;
  // price?: number;
  [key: string]: any;            // Allows for other fields not explicitly typed
}

// Represents the structure of a Tenant document from the database (after .lean())
interface TenantDocument {
  _id: Types.ObjectId | string; // Mongoose's default ObjectId
  cognitoId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  favorites?: number[];         // Array of numeric Property IDs, optional
  // Add other known fields from your Tenant schema if available, e.g.:
  // createdAt?: Date;
  // updatedAt?: Date;
  [key: string]: any;            // Allows for other fields not explicitly typed
}

// Represents a Tenant document for API responses, where 'favorites' (Property IDs)
// have been populated with actual PropertyDocument objects.
// NextResponse.json will handle serialization of _id (ObjectId to string).
interface PopulatedTenantResponse extends Omit<TenantDocument, 'favorites' | '_id'> {
  _id: string; // After NextResponse.json, _id is usually a string
  favorites: PropertyDocument[];
}

// Type for the Next.js route handler context parameters
interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// Type for the request body when updating a Tenant (PUT request)
interface TenantPutRequestBody {
  cognitoId?: string; // Included for completeness, though typically not updated from body
  name?: string;
  email?: string;
  phoneNumber?: string; // Destructured in original code but not used in $set
  [key: string]: any; // Allows for other potential fields in the body
}

// Type for the data that is actually used for $set in the update operation
interface TenantUpdateData {
  name?: string;
  email?: string;
  // phoneNumber is intentionally omitted as per original logic
}

// Simplified type for Mongoose Validation Error structure
interface MongooseValidationError {
  name: 'ValidationError';
  message: string;
  errors: {
    [key: string]: { // Path of the validation error
      message: string;
      kind?: string;
      path?: string;
      value?: any;
      reason?: any;
    };
  };
}

// Type guard to check if an error is a MongooseValidationError
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}

// --- END Standard Type Definitions ---

// --- GET Handler (Get Tenant by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- GET /api/tenants/[cognitoId] ---");
  console.log("Received context:", context);
  console.log("Type of context.params:", typeof context.params);
  if (context.params) {
    console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
    console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  } else {
    console.log("context.params is undefined or null");
  }
  // --- End Debug Logging ---

  await dbConnect();

  const routeCognitoId: string = context.params.cognitoId;

  if (!routeCognitoId) {
    console.error("Error: routeCognitoId is missing from context.params");
    return NextResponse.json({ message: 'Cognito ID is required in path parameters' }, { status: 400 });
  }

  console.log(`Attempting to find tenant with cognitoId: ${routeCognitoId}`);

  try {
    const tenant: TenantDocument | null = await Tenant.findOne({ cognitoId: routeCognitoId })
      .lean()
      .exec() as TenantDocument | null;

    if (!tenant) {
      console.log(`Tenant not found for cognitoId: ${routeCognitoId}`);
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    console.log(`Tenant found for cognitoId: ${routeCognitoId}`, tenant);

    const { favorites: favoritePropertyIds, ...restOfTenant } = tenant;
    // Prepare the response object, ensuring _id is a string if it's ObjectId
    const populatedTenantResponse: PopulatedTenantResponse = {
      ...restOfTenant,
      _id: typeof tenant._id === 'string' ? tenant._id : tenant._id.toString(), // Ensure _id is string for response
      favorites: [], // Initialize with empty array
    };

    if (favoritePropertyIds && Array.isArray(favoritePropertyIds) && favoritePropertyIds.length > 0) {
      // **FIX APPLIED HERE**
      const favoriteProperties = await Property.find({
        id: { $in: favoritePropertyIds }
      }).lean().exec() as unknown as PropertyDocument[]; // Cast via unknown
      populatedTenantResponse.favorites = favoriteProperties.map(p => ({
        ...p,
        _id: typeof p._id === 'string' ? p._id : p._id.toString(), // Ensure _id is string for response
      }));
    }

    return NextResponse.json(populatedTenantResponse, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error fetching tenant ${routeCognitoId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving tenant: ${message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Tenant by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- PUT /api/tenants/[cognitoId] ---");
  console.log("Received context:", context);
  console.log("Type of context.params:", typeof context.params);
  if (context.params) {
    console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
    console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  } else {
    console.log("context.params is undefined or null");
  }
  // --- End Debug Logging ---

  await dbConnect();

  const routeCognitoId: string = context.params.cognitoId;

  if (!routeCognitoId) {
    console.error("Error: routeCognitoId is missing from context.params in PUT request");
    return NextResponse.json({ message: 'Cognito ID is required in path parameters' }, { status: 400 });
  }

  console.log(`Attempting to update tenant with cognitoId: ${routeCognitoId}`);

  try {
    const body: TenantPutRequestBody = await request.json();
    const { cognitoId: cognitoIdFromBody, ...updatePayload } = body;

    if (cognitoIdFromBody && cognitoIdFromBody !== routeCognitoId) {
        console.warn(`Attempt to update cognitoId in body for ${routeCognitoId}. This is usually not allowed.`);
    }

    const dataToUpdate: TenantUpdateData = {};
    if (updatePayload.name !== undefined) {
      dataToUpdate.name = updatePayload.name;
    }
    if (updatePayload.email !== undefined) {
      dataToUpdate.email = updatePayload.email;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedTenant: TenantDocument | null = await Tenant.findOneAndUpdate(
      { cognitoId: routeCognitoId },
      { $set: dataToUpdate },
      { new: true, runValidators: true }
    ).lean().exec() as TenantDocument | null;

    if (!updatedTenant) {
      console.log(`Tenant not found or no changes made for cognitoId: ${routeCognitoId}`);
      return NextResponse.json({ message: 'Tenant not found or no changes made' }, { status: 404 });
    }

    console.log(`Tenant updated for cognitoId: ${routeCognitoId}`, updatedTenant);

    const { favorites: favoritePropertyIdsFromUpdate, ...restOfUpdatedTenant } = updatedTenant;
    const populatedUpdatedTenantResponse: PopulatedTenantResponse = {
      ...restOfUpdatedTenant,
      _id: typeof updatedTenant._id === 'string' ? updatedTenant._id : updatedTenant._id.toString(), // Ensure _id is string for response
      favorites: [],
    };

    if (favoritePropertyIdsFromUpdate && Array.isArray(favoritePropertyIdsFromUpdate) && favoritePropertyIdsFromUpdate.length > 0) {
        // **FIX APPLIED HERE**
        const favoriteProperties = await Property.find({
             id: { $in: favoritePropertyIdsFromUpdate }
        }).lean().exec() as unknown as PropertyDocument[]; // Cast via unknown
        populatedUpdatedTenantResponse.favorites = favoriteProperties.map(p => ({
          ...p,
          _id: typeof p._id === 'string' ? p._id : p._id.toString(), // Ensure _id is string for response
        }));
    }

    return NextResponse.json(populatedUpdatedTenantResponse, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error updating tenant ${routeCognitoId}:`, error);
    if (isMongooseValidationError(error)) {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error updating tenant: ${message}` }, { status: 500 });
  }
}