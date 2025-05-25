// src/app/api/managers/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Manager from '@/lib/models/Manager'; // Your Mongoose Manager model
import { authenticateAndAuthorize, AuthenticatedUser } from '@/lib/authUtils'; // Adjust path to your auth utility

// --- GET Handler (Get Manager by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: { params: { cognitoId: string } } // CHANGED: Using 'context'
) {
  // --- Start Debug Logging (consistent with tenants) ---
  console.log("--- GET /api/managers/[cognitoId] ---");
  console.log("Received context:", context);
  if (context.params) {
    console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
    console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  } else {
    console.log("context.params is undefined or null");
  }
  // --- End Debug Logging ---

  const cognitoIdFromPath = context.params?.cognitoId; // CHANGED: Accessing via context.params

  // Log entry and raw param value IMMEDIATELY (already good, keeping for consistency)
  console.log(`[API /managers/:id GET] Handler invoked. Raw path param cognitoId (from context): "${cognitoIdFromPath}"`);

  // --- AUTHENTICATION & AUTHORIZATION ---
  const authResult = await authenticateAndAuthorize(request, ['manager']);
  if (authResult instanceof NextResponse) {
    console.log('[API /managers/:id GET] Auth failed or returned response.');
    return authResult;
  }
  const authenticatedUser = authResult as AuthenticatedUser;
  console.log(`[API /managers/:id GET] Auth successful. Authenticated user ID: "${authenticatedUser.id}", Role: "${authenticatedUser.role}"`);

  if (authenticatedUser.id !== cognitoIdFromPath) {
    console.warn(`[API /managers/:id GET] Forbidden: Auth user "${authenticatedUser.id}" trying to access manager profile for "${cognitoIdFromPath}".`);
    return NextResponse.json({ message: 'Forbidden: You can only access your own profile.' }, { status: 403 });
  }
  console.log(`[API /managers/:id GET] Authorization check passed: Path ID matches token ID.`);
  // --- END AUTH ---

  if (!cognitoIdFromPath || typeof cognitoIdFromPath !== 'string' || cognitoIdFromPath.trim() === '') {
    console.warn('[API /managers/:id GET] Invalid or missing cognitoId in path.');
    return NextResponse.json({ message: 'Cognito ID path parameter is required and must be a non-empty string' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /managers/:id GET] DB connected. Querying for cognitoId: "${cognitoIdFromPath}"`);

  try {
    const manager = await Manager.findOne({ cognitoId: cognitoIdFromPath }).lean().exec();

    if (!manager) {
      console.log(`[API /managers/:id GET] MongoDB Query Result: Manager with Cognito ID "${cognitoIdFromPath}" NOT FOUND.`);
      return NextResponse.json({ message: 'Manager not found' }, { status: 404 });
    }

    console.log(`[API /managers/:id GET] MongoDB Query Result: Found manager "${manager.name}" for Cognito ID "${cognitoIdFromPath}".`);
    return NextResponse.json(manager, { status: 200 });

  } catch (error: any) {
    console.error(`[API /managers/:id GET] Database or other error fetching manager "${cognitoIdFromPath}":`, error);
    return NextResponse.json({ message: `Error retrieving manager: ${error.message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Manager by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: { params: { cognitoId: string } } // CHANGED: Using 'context'
) {
  // --- Start Debug Logging (consistent with tenants) ---
  console.log("--- PUT /api/managers/[cognitoId] ---");
  console.log("Received context:", context);
  if (context.params) {
    console.log("Type of context.params.cognitoId:", typeof context.params.cognitoId);
    console.log("Value of context.params.cognitoId:", context.params.cognitoId);
  } else {
    console.log("context.params is undefined or null");
  }
  // --- End Debug Logging ---

  const cognitoIdFromPath = context.params?.cognitoId; // CHANGED: Accessing via context.params
  console.log(`[API /managers/:id PUT] Handler invoked. Raw path param cognitoId (from context): "${cognitoIdFromPath}"`);

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

  if (!cognitoIdFromPath) {
    console.error("Error: cognitoIdFromPath is missing from context.params in PUT request");
    return NextResponse.json({ message: 'Cognito ID is required in path' }, { status: 400 });
  }

  await dbConnect();
  console.log(`[API /managers/:id PUT] DB connected. Processing for cognitoId: ${cognitoIdFromPath}`);

  try {
    const body = await request.json();
    console.log(`[API /managers/:id PUT] Request body:`, body);
    // CHANGED: Removed phoneNumber from destructuring and updateData
    const { cognitoId: cognitoIdFromBody, name, email, ...otherPayload } = body;

    if (cognitoIdFromBody && cognitoIdFromBody !== cognitoIdFromPath) {
        console.warn(`Attempt to update cognitoId in body for ${cognitoIdFromPath}. This is usually not allowed.`);
    }
    
    // CHANGED: phoneNumber removed from updateData
    const updateData: { name?: string; email?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    // No longer handling phoneNumber here

    if (Object.keys(updateData).length === 0) {
      console.log('[API /managers/:id PUT] No valid fields (name, email) provided for update.');
      return NextResponse.json({ message: 'No valid fields (name, email) provided for update' }, { status: 400 });
    }

    const updatedManager = await Manager.findOneAndUpdate(
      { cognitoId: cognitoIdFromPath },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updatedManager) {
      console.log(`[API /managers/:id PUT] Manager with Cognito ID "${cognitoIdFromPath}" not found for update or no changes made.`);
      return NextResponse.json({ message: 'Manager not found or no changes made' }, { status: 404 });
    }

    console.log(`[API /managers/:id PUT] Updated manager: ${updatedManager.name}`);
    return NextResponse.json(updatedManager, { status: 200 });

  } catch (error: any) {
    console.error(`[API /managers/:id PUT] Error updating manager "${cognitoIdFromPath}":`, error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating manager: ${error.message}` }, { status: 500 });
  }
}