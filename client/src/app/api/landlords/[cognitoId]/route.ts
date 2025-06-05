// src/app/api/landlords/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId type
import dbConnect from '@/lib/dbConnect';
import Landlord from '@/lib/models/Landlord';

// --- START Standard Type Definitions ---

// Interface for the structure of a Landlord document from the database (after .lean())
interface LandlordDocument {
  _id: Types.ObjectId | string; // Mongoose ObjectId or string after lean/serialization
  cognitoId: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  description?: string;
  businessLicense?: string;
  profileImage?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any; // Allows for other fields not explicitly typed
}

// Interface for the Landlord object as returned in API responses
interface LandlordResponse {
  _id: string;
  cognitoId: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  description?: string;
  businessLicense?: string;
  profileImage?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Type for the Next.js route handler context parameters
interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// Type for the request body when updating a Landlord (PUT request)
interface LandlordPutRequestBody {
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  description?: string;
  businessLicense?: string;
  profileImage?: string;
  status?: string;
  [key: string]: any;
}

// Type for the data that is actually used for $set in the update operation
interface LandlordUpdateData {
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  description?: string;
  businessLicense?: string;
  profileImage?: string;
  status?: string;
  updatedAt?: Date;
}

// Simplified type for Mongoose Validation Error structure
interface MongooseValidationError {
  name: 'ValidationError';
  message: string;
  errors: {
    [key: string]: {
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

// --- GET Handler (Get Landlord by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: HandlerContext
) {
  console.log("--- GET /api/landlords/[cognitoId] ---");
  console.log("Received context:", context);
  console.log("Value of context.params.cognitoId:", context.params.cognitoId);

  const cognitoIdFromPath: string = context.params.cognitoId;

  console.log(`[API /landlords/:id GET] Handler invoked. Path param cognitoId: "${cognitoIdFromPath}"`);

  // Basic validation for cognitoId
  if (!cognitoIdFromPath || cognitoIdFromPath.trim() === '') {
    console.warn('[API /landlords/:id GET] Invalid or missing cognitoId in path.');
    return NextResponse.json({ message: 'Cognito ID path parameter is required and must be a non-empty string' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /landlords/:id GET] DB connected. Querying for cognitoId: "${cognitoIdFromPath}"`);

  try {
    const landlord = await Landlord.findOne({ cognitoId: cognitoIdFromPath })
      .lean()
      .exec() as unknown as LandlordDocument | null;

    if (!landlord) {
      console.log(`[API /landlords/:id GET] MongoDB Query Result: Landlord with Cognito ID "${cognitoIdFromPath}" NOT FOUND.`);
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    console.log(`[API /landlords/:id GET] MongoDB Query Result: Found landlord "${landlord.name || '(name not set)'}" for Cognito ID "${cognitoIdFromPath}".`);

    // Prepare response object conforming to LandlordResponse
    const responseLandlord: LandlordResponse = {
      ...landlord,
      _id: typeof landlord._id === 'string' ? landlord._id : landlord._id.toString(),
      createdAt: landlord.createdAt?.toISOString(),
      updatedAt: landlord.updatedAt?.toISOString(),
    };

    return NextResponse.json(responseLandlord, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API /landlords/:id GET] Database or other error fetching landlord "${cognitoIdFromPath}":`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving landlord: ${message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Landlord by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: HandlerContext
) {
  console.log("--- PUT /api/landlords/[cognitoId] ---");
  console.log("Received context:", context);
  console.log("Value of context.params.cognitoId:", context.params.cognitoId);

  const cognitoIdFromPath: string = context.params.cognitoId;
  console.log(`[API /landlords/:id PUT] Handler invoked. Path param cognitoId: "${cognitoIdFromPath}"`);

  // Basic validation for cognitoId
  if (!cognitoIdFromPath || cognitoIdFromPath.trim() === '') {
    console.error("Error: cognitoIdFromPath is invalid or missing from context.params in PUT request");
    return NextResponse.json({ message: 'Cognito ID is required in path and must be non-empty' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /landlords/:id PUT] DB connected. Processing for cognitoId: ${cognitoIdFromPath}`);

  try {
    const body: LandlordPutRequestBody = await request.json();
    console.log(`[API /landlords/:id PUT] Request body:`, body);

    const { 
      name, 
      email, 
      companyName, 
      phone, 
      address, 
      description, 
      businessLicense, 
      profileImage, 
      status 
    } = body;

    const updateData: LandlordUpdateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (businessLicense !== undefined) updateData.businessLicense = businessLicense;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (status !== undefined) updateData.status = status;
    
    // Always update the updatedAt field
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length === 1) { // Only updatedAt was added
      console.log('[API /landlords/:id PUT] No valid fields provided for update.');
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedLandlord = await Landlord.findOneAndUpdate(
      { cognitoId: cognitoIdFromPath },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec() as unknown as LandlordDocument | null;

    if (!updatedLandlord) {
      console.log(`[API /landlords/:id PUT] Landlord with Cognito ID "${cognitoIdFromPath}" not found for update or no changes made.`);
      return NextResponse.json({ message: 'Landlord not found or no changes made' }, { status: 404 });
    }

    console.log(`[API /landlords/:id PUT] Updated landlord name: ${updatedLandlord.name || '(name not set)'}`);

    // Prepare response object conforming to LandlordResponse
    const responseLandlord: LandlordResponse = {
      ...updatedLandlord,
      _id: typeof updatedLandlord._id === 'string' ? updatedLandlord._id : updatedLandlord._id.toString(),
      createdAt: updatedLandlord.createdAt?.toISOString(),
      updatedAt: updatedLandlord.updatedAt?.toISOString(),
    };

    return NextResponse.json(responseLandlord, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API /landlords/:id PUT] Error updating landlord "${cognitoIdFromPath}":`, error);
    if (isMongooseValidationError(error)) {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error updating landlord: ${message}` }, { status: 500 });
  }
}