// src/app/api/buyers/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId
import dbConnect from '@/lib/dbConnect';
import Buyer from '@/lib/models/Buyer';     // Your Mongoose buyer model
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

// Represents the structure of a buyer document from the database (after .lean())
interface buyerDocument {
  _id: Types.ObjectId | string; // Mongoose's default ObjectId
  cognitoId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  favorites?: number[];         // Array of numeric Property IDs, optional
  // Add other known fields from your buyer schema if available, e.g.:
  // createdAt?: Date;
  // updatedAt?: Date;
  [key: string]: any;            // Allows for other fields not explicitly typed
}

// Represents a buyer document for API responses, where 'favorites' (Property IDs)
// have been populated with actual PropertyDocument objects.
// NextResponse.json will handle serialization of _id (ObjectId to string).
interface PopulatedbuyerResponse extends Omit<buyerDocument, 'favorites' | '_id'> {
  _id: string; // After NextResponse.json, _id is usually a string
  favorites: PropertyDocument[];
}

// Type for the Next.js route handler context parameters
interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// Type for the request body when updating a buyer (PUT request)
interface buyerPutRequestBody {
  cognitoId?: string; // Included for completeness, though typically not updated from body
  name?: string;
  email?: string;
  phoneNumber?: string; // Destructured in original code but not used in $set
  [key: string]: any; // Allows for other potential fields in the body
}

// Type for the data that is actually used for $set in the update operation
interface buyerUpdateData {
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

// --- GET Handler (Get buyer by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
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

  console.log(`Attempting to find buyer with cognitoId: ${routeCognitoId}`);

  try {
    const buyer: buyerDocument | null = await Buyer.findOne({ cognitoId: routeCognitoId })
      .lean()
      .exec() as buyerDocument | null;

    if (!buyer) {
      return NextResponse.json({ message: 'buyer not found' }, { status: 404 });
    }


    const { favorites: favoritePropertyIds, ...restOfbuyer } = buyer;
    // Prepare the response object, ensuring _id is a string if it's ObjectId
    const populatedbuyerResponse: PopulatedbuyerResponse = {
      ...restOfbuyer,
      _id: typeof buyer._id === 'string' ? buyer._id : buyer._id.toString(), // Ensure _id is string for response
      favorites: [], // Initialize with empty array
    };

    if (favoritePropertyIds && Array.isArray(favoritePropertyIds) && favoritePropertyIds.length > 0) {
      // **FIX APPLIED HERE**
      const favoriteProperties = await Property.find({
        id: { $in: favoritePropertyIds }
      }).lean().exec() as unknown as PropertyDocument[]; // Cast via unknown
      populatedbuyerResponse.favorites = favoriteProperties.map(p => ({
        ...p,
        _id: typeof p._id === 'string' ? p._id : p._id.toString(), // Ensure _id is string for response
      }));
    }

    return NextResponse.json(populatedbuyerResponse, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error fetching buyer ${routeCognitoId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving buyer: ${message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update buyer by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- PUT /api/buyers/[cognitoId] ---");
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

  console.log(`Attempting to update buyer with cognitoId: ${routeCognitoId}`);

  try {
    const body: buyerPutRequestBody = await request.json();
    const { cognitoId: cognitoIdFromBody, ...updatePayload } = body;

    if (cognitoIdFromBody && cognitoIdFromBody !== routeCognitoId) {
        console.warn(`Attempt to update cognitoId in body for ${routeCognitoId}. This is usually not allowed.`);
    }

    const dataToUpdate: buyerUpdateData = {};
    if (updatePayload.name !== undefined) {
      dataToUpdate.name = updatePayload.name;
    }
    if (updatePayload.email !== undefined) {
      dataToUpdate.email = updatePayload.email;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedbuyer: buyerDocument | null = await Buyer.findOneAndUpdate(
      { cognitoId: routeCognitoId },
      { $set: dataToUpdate },
      { new: true, runValidators: true }
    ).lean().exec() as buyerDocument | null;

    if (!updatedbuyer) {
      console.log(`buyer not found or no changes made for cognitoId: ${routeCognitoId}`);
      return NextResponse.json({ message: 'buyer not found or no changes made' }, { status: 404 });
    }

    console.log(`buyer updated for cognitoId: ${routeCognitoId}`, updatedbuyer);

    const { favorites: favoritePropertyIdsFromUpdate, ...restOfUpdatedbuyer } = updatedbuyer;
    const populatedUpdatedbuyerResponse: PopulatedbuyerResponse = {
      ...restOfUpdatedbuyer,
      _id: typeof updatedbuyer._id === 'string' ? updatedbuyer._id : updatedbuyer._id.toString(), // Ensure _id is string for response
      favorites: [],
    };

    if (favoritePropertyIdsFromUpdate && Array.isArray(favoritePropertyIdsFromUpdate) && favoritePropertyIdsFromUpdate.length > 0) {
        // **FIX APPLIED HERE**
        const favoriteProperties = await Property.find({
             id: { $in: favoritePropertyIdsFromUpdate }
        }).lean().exec() as unknown as PropertyDocument[]; // Cast via unknown
        populatedUpdatedbuyerResponse.favorites = favoriteProperties.map(p => ({
          ...p,
          _id: typeof p._id === 'string' ? p._id : p._id.toString(), // Ensure _id is string for response
        }));
    }

    return NextResponse.json(populatedUpdatedbuyerResponse, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error updating buyer ${routeCognitoId}:`, error);
    if (isMongooseValidationError(error)) {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error updating buyer: ${message}` }, { status: 500 });
  }
}