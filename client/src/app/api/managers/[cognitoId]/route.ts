// src/app/api/managers/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId type
import dbConnect from '@/lib/dbConnect';
import Manager from '@/lib/models/Manager'; // Your Mongoose Manager model
import { authenticateAndAuthorize, AuthenticatedUser } from '@/lib/authUtils'; // Adjust path to your auth utility

// --- START Standard Type Definitions ---

// Interface for the structure of a Manager document from the database (after .lean())
interface ManagerDocument {
  _id: Types.ObjectId | string; // Mongoose ObjectId or string after lean/serialization
  cognitoId: string;
  name?: string; // Assuming name can be optional or not always set
  email?: string; // Assuming email can be optional
  // Add any other fields from your Manager schema here
  // e.g., companyName?: string;
  [key: string]: any; // Allows for other fields not explicitly typed
}

// Interface for the Manager object as returned in API responses
// This often involves ensuring _id is a string for JSON serialization
interface ManagerResponse {
  _id: string;
  cognitoId: string;
  name?: string;
  email?: string;
  // Add any other fields consistent with ManagerDocument, ensuring proper serialization
  [key: string]: any;
}

// Type for the Next.js route handler context parameters
interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// Type for the request body when updating a Manager (PUT request)
interface ManagerPutRequestBody {
  cognitoId?: string; // cognitoId from body, if sent
  name?: string;
  email?: string;
  // Allows for other potential fields in the body (e.g., ...otherPayload)
  [key: string]: any;
}

// Type for the data that is actually used for $set in the update operation
interface ManagerUpdateData {
  name?: string;
  email?: string;
}

// Simplified type for Mongoose Validation Error structure (reusable)
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

// Type guard to check if an error is a MongooseValidationError (reusable)
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}

// --- END Standard Type Definitions ---


// --- GET Handler (Get Manager by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- GET /api/managers/[cognitoId] ---");
  console.log("Received context:", context);
  // context.params.cognitoId is guaranteed by HandlerContext and routing
  console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
  console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  // --- End Debug Logging ---

  const cognitoIdFromPath: string = context.params.cognitoId;

  console.log(`[API /managers/:id GET] Handler invoked. Path param cognitoId: "${cognitoIdFromPath}"`);

  // --- AUTHENTICATION & AUTHORIZATION ---
  const authResult = await authenticateAndAuthorize(request, ['manager']);
  if (authResult instanceof NextResponse) {
    console.log('[API /managers/:id GET] Auth failed or returned response.');
    return authResult;
  }
  // Assuming authenticateAndAuthorize returns AuthenticatedUser if not NextResponse
  const authenticatedUser = authResult as AuthenticatedUser;
  console.log(`[API /managers/:id GET] Auth successful. Authenticated user ID: "${authenticatedUser.id}", Role: "${authenticatedUser.role}"`);

  if (authenticatedUser.id !== cognitoIdFromPath) {
    console.warn(`[API /managers/:id GET] Forbidden: Auth user "${authenticatedUser.id}" trying to access manager profile for "${cognitoIdFromPath}".`);
    return NextResponse.json({ message: 'Forbidden: You can only access your own profile.' }, { status: 403 });
  }
  console.log(`[API /managers/:id GET] Authorization check passed: Path ID matches token ID.`);
  // --- END AUTH ---

  // The check for cognitoIdFromPath being a non-empty string is still useful
  if (!cognitoIdFromPath || cognitoIdFromPath.trim() === '') {
    console.warn('[API /managers/:id GET] Invalid or missing cognitoId in path.');
    return NextResponse.json({ message: 'Cognito ID path parameter is required and must be a non-empty string' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /managers/:id GET] DB connected. Querying for cognitoId: "${cognitoIdFromPath}"`);

  try {
    // Apply type assertion: cast to unknown first, then to the desired type
    const manager = await Manager.findOne({ cognitoId: cognitoIdFromPath })
      .lean()
      .exec() as unknown as ManagerDocument | null;

    if (!manager) {
      console.log(`[API /managers/:id GET] MongoDB Query Result: Manager with Cognito ID "${cognitoIdFromPath}" NOT FOUND.`);
      return NextResponse.json({ message: 'Manager not found' }, { status: 404 });
    }

    // Now 'manager.name' is accessible due to ManagerDocument type
    console.log(`[API /managers/:id GET] MongoDB Query Result: Found manager "${manager.name || '(name not set)'}" for Cognito ID "${cognitoIdFromPath}".`);

    // Prepare response object conforming to ManagerResponse
    const responseManager: ManagerResponse = {
      ...manager, // Spread existing lean properties
      _id: typeof manager._id === 'string' ? manager._id : manager._id.toString(), // Ensure _id is string
      // Ensure other fields match ManagerResponse, or transform as needed
      name: manager.name,
      email: manager.email,
      cognitoId: manager.cognitoId,
    };

    return NextResponse.json(responseManager, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error(`[API /managers/:id GET] Database or other error fetching manager "${cognitoIdFromPath}":`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving manager: ${message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Manager by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: HandlerContext
) {
  // --- Start Debug Logging ---
  console.log("--- PUT /api/managers/[cognitoId] ---");
  console.log("Received context:", context);
  console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
  console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  // --- End Debug Logging ---

  const cognitoIdFromPath: string = context.params.cognitoId;
  console.log(`[API /managers/:id PUT] Handler invoked. Path param cognitoId: "${cognitoIdFromPath}"`);

  // --- AUTHENTICATION & AUTHORIZATION ---
  const authResult = await authenticateAndAuthorize(request, ['manager']);
  if (authResult instanceof NextResponse) {
    console.log('[API /managers/:id PUT] Auth failed or returned response.');
    return authResult;
  }
  const authenticatedUser = authResult as AuthenticatedUser;
  console.log(`[API /managers/:id PUT] Auth successful. Authenticated user ID: "${authenticatedUser.id}", Role: "${authenticatedUser.role}"`);

  if (authenticatedUser.id !== cognitoIdFromPath) {
    console.warn(`[API /managers/:id PUT] Forbidden: Auth user "${authenticatedUser.id}" trying to update manager profile for "${cognitoIdFromPath}".`);
    return NextResponse.json({ message: 'Forbidden: You can only update your own profile.' }, { status: 403 });
  }
  console.log(`[API /managers/:id PUT] Authorization check passed.`);
  // --- END AUTH ---

  if (!cognitoIdFromPath || cognitoIdFromPath.trim() === '') { // Retaining non-empty check
    console.error("Error: cognitoIdFromPath is invalid or missing from context.params in PUT request");
    return NextResponse.json({ message: 'Cognito ID is required in path and must be non-empty' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /managers/:id PUT] DB connected. Processing for cognitoId: ${cognitoIdFromPath}`);

  try {
    const body: ManagerPutRequestBody = await request.json();
    console.log(`[API /managers/:id PUT] Request body:`, body);

    const { cognitoId: cognitoIdFromBody, name, email } = body; // Removed ...otherPayload as it wasn't used

    if (cognitoIdFromBody && cognitoIdFromBody !== cognitoIdFromPath) {
        console.warn(`Attempt to update cognitoId in body for ${cognitoIdFromPath}. This is usually not allowed.`);
        // Optionally, return an error if you strictly forbid this.
    }
    
    const updateData: ManagerUpdateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      console.log('[API /managers/:id PUT] No valid fields (name, email) provided for update.');
      return NextResponse.json({ message: 'No valid fields (name, email) provided for update' }, { status: 400 });
    }

    const updatedManager = await Manager.findOneAndUpdate(
      { cognitoId: cognitoIdFromPath },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec() as unknown as ManagerDocument | null; // Apply type assertion

    if (!updatedManager) {
      console.log(`[API /managers/:id PUT] Manager with Cognito ID "${cognitoIdFromPath}" not found for update or no changes made.`);
      return NextResponse.json({ message: 'Manager not found or no changes made' }, { status: 404 });
    }

    // Now 'updatedManager.name' is accessible
    console.log(`[API /managers/:id PUT] Updated manager name: ${updatedManager.name || '(name not set)'}`);

    // Prepare response object conforming to ManagerResponse
    const responseManager: ManagerResponse = {
        ...updatedManager, // Spread existing lean properties
        _id: typeof updatedManager._id === 'string' ? updatedManager._id : updatedManager._id.toString(), // Ensure _id is string
        name: updatedManager.name,
        email: updatedManager.email,
        cognitoId: updatedManager.cognitoId,
    };

    return NextResponse.json(responseManager, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error(`[API /managers/:id PUT] Error updating manager "${cognitoIdFromPath}":`, error);
    if (isMongooseValidationError(error)) { // Use type guard
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error updating manager: ${message}` }, { status: 500 });
  }
}