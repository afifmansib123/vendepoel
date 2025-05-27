// src/app/api/landlords/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId type
import dbConnect from '@/lib/dbConnect';
import Landlord from '@/lib/models/Landlord'; // Changed from Manager to Landlord
import { authenticateAndAuthorize, AuthenticatedUser } from '@/lib/authUtils'; // Adjust path to your auth utility

// --- START Standard Type Definitions (Renamed for Landlord) ---

// Interface for the structure of a Landlord document from the database (after .lean())
interface LandlordDocument {
  _id: Types.ObjectId | string; // Mongoose ObjectId or string after lean/serialization
  cognitoId: string;
  name?: string; // Assuming name can be optional or not always set
  email?: string; // Assuming email can be optional
  // Add any other fields from your Landlord schema here
  // e.g., companyName?: string;
  [key: string]: any; // Allows for other fields not explicitly typed
}

// Interface for the Landlord object as returned in API responses
// This often involves ensuring _id is a string for JSON serialization
interface LandlordResponse {
  _id: string;
  cognitoId: string;
  name?: string;
  email?: string;
  // Add any other fields consistent with LandlordDocument, ensuring proper serialization
  [key: string]: any;
}

// Type for the Next.js route handler context parameters (remains the same)
interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// Type for the request body when updating a Landlord (PUT request)
interface LandlordPutRequestBody {
  cognitoId?: string; // cognitoId from body, if sent
  name?: string;
  email?: string;
  // Allows for other potential fields in the body (e.g., ...otherPayload)
  [key: string]: any;
}

// Type for the data that is actually used for $set in the update operation
interface LandlordUpdateData {
  name?: string;
  email?: string;
}

// Simplified type for Mongoose Validation Error structure (reusable, remains the same)
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

// Type guard to check if an error is a MongooseValidationError (reusable, remains the same)
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}

// --- END Standard Type Definitions ---


// --- GET Handler (Get Landlord by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- GET /api/landlords/[cognitoId] ---"); // Renamed
  console.log("Received context:", context);
  // context.params.cognitoId is guaranteed by HandlerContext and routing
  console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
  console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  // --- End Debug Logging ---

  const cognitoIdFromPath: string = context.params.cognitoId;

  console.log(`[API /landlords/:id GET] Handler invoked. Path param cognitoId: "${cognitoIdFromPath}"`); // Renamed

  // --- AUTHENTICATION & AUTHORIZATION ---
  // Assuming 'landlord' is the correct role for Landlord entities
  const authResult = await authenticateAndAuthorize(request, ['landlord']); // Role changed to 'landlord'
  if (authResult instanceof NextResponse) {
    console.log('[API /landlords/:id GET] Auth failed or returned response.'); // Renamed
    return authResult;
  }
  // Assuming authenticateAndAuthorize returns AuthenticatedUser if not NextResponse
  const authenticatedUser = authResult as AuthenticatedUser;
  console.log(`[API /landlords/:id GET] Auth successful. Authenticated user ID: "${authenticatedUser.id}", Role: "${authenticatedUser.role}"`); // Renamed

  if (authenticatedUser.id !== cognitoIdFromPath) {
    console.warn(`[API /landlords/:id GET] Forbidden: Auth user "${authenticatedUser.id}" trying to access landlord profile for "${cognitoIdFromPath}".`); // Renamed
    return NextResponse.json({ message: 'Forbidden: You can only access your own profile.' }, { status: 403 });
  }
  console.log(`[API /landlords/:id GET] Authorization check passed: Path ID matches token ID.`); // Renamed
  // --- END AUTH ---

  // The check for cognitoIdFromPath being a non-empty string is still useful
  if (!cognitoIdFromPath || cognitoIdFromPath.trim() === '') {
    console.warn('[API /landlords/:id GET] Invalid or missing cognitoId in path.'); // Renamed
    return NextResponse.json({ message: 'Cognito ID path parameter is required and must be a non-empty string' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /landlords/:id GET] DB connected. Querying for cognitoId: "${cognitoIdFromPath}"`); // Renamed

  try {
    // Apply type assertion: cast to unknown first, then to the desired type
    const landlord = await Landlord.findOne({ cognitoId: cognitoIdFromPath }) // Changed Manager to Landlord
      .lean()
      .exec() as unknown as LandlordDocument | null; // Changed ManagerDocument to LandlordDocument

    if (!landlord) {
      console.log(`[API /landlords/:id GET] MongoDB Query Result: Landlord with Cognito ID "${cognitoIdFromPath}" NOT FOUND.`); // Renamed
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 }); // Renamed
    }

    // Now 'landlord.name' is accessible due to LandlordDocument type
    console.log(`[API /landlords/:id GET] MongoDB Query Result: Found landlord "${landlord.name || '(name not set)'}" for Cognito ID "${cognitoIdFromPath}".`); // Renamed

    // Prepare response object conforming to LandlordResponse
    const responseLandlord: LandlordResponse = { // Renamed
      ...landlord, // Spread existing lean properties
      _id: typeof landlord._id === 'string' ? landlord._id : landlord._id.toString(), // Ensure _id is string
      // Ensure other fields match LandlordResponse, or transform as needed
      name: landlord.name,
      email: landlord.email,
      cognitoId: landlord.cognitoId,
    };

    return NextResponse.json(responseLandlord, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error(`[API /landlords/:id GET] Database or other error fetching landlord "${cognitoIdFromPath}":`, error); // Renamed
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving landlord: ${message}` }, { status: 500 }); // Renamed
  }
}

// --- PUT Handler (Update Landlord by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- PUT /api/landlords/[cognitoId] ---"); // Renamed
  console.log("Received context:", context);
  console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
  console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  // --- End Debug Logging ---

  const cognitoIdFromPath: string = context.params.cognitoId;
  console.log(`[API /landlords/:id PUT] Handler invoked. Path param cognitoId: "${cognitoIdFromPath}"`); // Renamed

  // --- AUTHENTICATION & AUTHORIZATION ---
  // Assuming 'landlord' is the correct role for Landlord entities
  const authResult = await authenticateAndAuthorize(request, ['landlord']); // Role changed to 'landlord'
  if (authResult instanceof NextResponse) {
    console.log('[API /landlords/:id PUT] Auth failed or returned response.'); // Renamed
    return authResult;
  }
  const authenticatedUser = authResult as AuthenticatedUser;
  console.log(`[API /landlords/:id PUT] Auth successful. Authenticated user ID: "${authenticatedUser.id}", Role: "${authenticatedUser.role}"`); // Renamed

  if (authenticatedUser.id !== cognitoIdFromPath) {
    console.warn(`[API /landlords/:id PUT] Forbidden: Auth user "${authenticatedUser.id}" trying to update landlord profile for "${cognitoIdFromPath}".`); // Renamed
    return NextResponse.json({ message: 'Forbidden: You can only update your own profile.' }, { status: 403 });
  }
  console.log(`[API /landlords/:id PUT] Authorization check passed.`); // Renamed
  // --- END AUTH ---

  if (!cognitoIdFromPath || cognitoIdFromPath.trim() === '') { // Retaining non-empty check
    console.error("Error: cognitoIdFromPath is invalid or missing from context.params in PUT request");
    return NextResponse.json({ message: 'Cognito ID is required in path and must be non-empty' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /landlords/:id PUT] DB connected. Processing for cognitoId: ${cognitoIdFromPath}`); // Renamed

  try {
    const body: LandlordPutRequestBody = await request.json(); // Changed ManagerPutRequestBody
    console.log(`[API /landlords/:id PUT] Request body:`, body); // Renamed

    const { cognitoId: cognitoIdFromBody, name, email } = body; // Removed ...otherPayload as it wasn't used

    if (cognitoIdFromBody && cognitoIdFromBody !== cognitoIdFromPath) {
        console.warn(`Attempt to update cognitoId in body for ${cognitoIdFromPath}. This is usually not allowed.`);
        // Optionally, return an error if you strictly forbid this.
    }
    
    const updateData: LandlordUpdateData = {}; // Changed ManagerUpdateData
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      console.log('[API /landlords/:id PUT] No valid fields (name, email) provided for update.'); // Renamed
      return NextResponse.json({ message: 'No valid fields (name, email) provided for update' }, { status: 400 });
    }

    const updatedLandlord = await Landlord.findOneAndUpdate( // Changed Manager to Landlord
      { cognitoId: cognitoIdFromPath },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec() as unknown as LandlordDocument | null; // Apply type assertion, changed ManagerDocument

    if (!updatedLandlord) {
      console.log(`[API /landlords/:id PUT] Landlord with Cognito ID "${cognitoIdFromPath}" not found for update or no changes made.`); // Renamed
      return NextResponse.json({ message: 'Landlord not found or no changes made' }, { status: 404 }); // Renamed
    }

    // Now 'updatedLandlord.name' is accessible
    console.log(`[API /landlords/:id PUT] Updated landlord name: ${updatedLandlord.name || '(name not set)'}`); // Renamed

    // Prepare response object conforming to LandlordResponse
    const responseLandlord: LandlordResponse = { // Renamed
        ...updatedLandlord, // Spread existing lean properties
        _id: typeof updatedLandlord._id === 'string' ? updatedLandlord._id : updatedLandlord._id.toString(), // Ensure _id is string
        name: updatedLandlord.name,
        email: updatedLandlord.email,
        cognitoId: updatedLandlord.cognitoId,
    };

    return NextResponse.json(responseLandlord, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error(`[API /landlords/:id PUT] Error updating landlord "${cognitoIdFromPath}":`, error); // Renamed
    if (isMongooseValidationError(error)) { // Use type guard
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error updating landlord: ${message}` }, { status: 500 }); // Renamed
  }
}