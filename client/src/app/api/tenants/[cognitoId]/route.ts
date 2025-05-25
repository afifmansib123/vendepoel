// src/app/api/tenants/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/lib/models/Tenant';     // Your Mongoose Tenant model
import Property from '@/lib/models/Property'; // Your Mongoose Property model

// --- GET Handler (Get Tenant by Cognito ID) ---
export async function GET(
  request: NextRequest,
  context: { params: { cognitoId: string } } // Changed from { params } to context
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

  // Access cognitoId directly from context.params
  const routeCognitoId = context.params?.cognitoId; // Optional chaining for safety during logging phase

  if (!routeCognitoId) {
    console.error("Error: routeCognitoId is missing from context.params");
    return NextResponse.json({ message: 'Cognito ID is required in path parameters' }, { status: 400 });
  }

  console.log(`Attempting to find tenant with cognitoId: ${routeCognitoId}`);

  try {
    const tenant = await Tenant.findOne({ cognitoId: routeCognitoId }).lean().exec();

    if (!tenant) {
      console.log(`Tenant not found for cognitoId: ${routeCognitoId}`);
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    console.log(`Tenant found for cognitoId: ${routeCognitoId}`, tenant);

    // Manually populate favorites if tenant.favorites stores numeric Property IDs
    let populatedTenant: any = { ...tenant };
    if (tenant.favorites && Array.isArray(tenant.favorites) && tenant.favorites.length > 0) {
      const favoritePropertyIds = tenant.favorites as number[];
      const favoriteProperties = await Property.find({
        id: { $in: favoritePropertyIds } // Assumes Property has numeric 'id'
      }).lean().exec();
      populatedTenant.favorites = favoriteProperties;
    } else {
      populatedTenant.favorites = [];
    }

    return NextResponse.json(populatedTenant, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching tenant ${routeCognitoId}:`, error);
    return NextResponse.json({ message: `Error retrieving tenant: ${error.message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Tenant by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  context: { params: { cognitoId: string } } // Changed from { params } to context
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

  // Access cognitoId directly from context.params
  const routeCognitoId = context.params?.cognitoId; // Optional chaining for safety

  if (!routeCognitoId) {
    console.error("Error: routeCognitoId is missing from context.params in PUT request");
    return NextResponse.json({ message: 'Cognito ID is required in path parameters' }, { status: 400 });
  }

  console.log(`Attempting to update tenant with cognitoId: ${routeCognitoId}`);

  try {
    const body = await request.json();
    const { cognitoId: cognitoIdFromBody, ...updatePayload } = body;

    if (cognitoIdFromBody && cognitoIdFromBody !== routeCognitoId) {
        console.warn(`Attempt to update cognitoId in body for ${routeCognitoId}. This is usually not allowed.`);
        // Optionally, return an error if you strictly forbid this:
        // return NextResponse.json({ message: 'Updating cognitoId via request body is not permitted.' }, { status: 400 });
    }

    const { name, email, phoneNumber } = updatePayload;
    const updateData: { name?: string; email?: string; phoneNumber?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedTenant = await Tenant.findOneAndUpdate(
      { cognitoId: routeCognitoId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updatedTenant) {
      console.log(`Tenant not found or no changes made for cognitoId: ${routeCognitoId}`);
      return NextResponse.json({ message: 'Tenant not found or no changes made' }, { status: 404 });
    }

    console.log(`Tenant updated for cognitoId: ${routeCognitoId}`, updatedTenant);

    let populatedUpdatedTenant: any = { ...updatedTenant };
    if (updatedTenant.favorites && Array.isArray(updatedTenant.favorites) && updatedTenant.favorites.length > 0) {
        const favoritePropertyIds = updatedTenant.favorites as number[];
        const favoriteProperties = await Property.find({ id: { $in: favoritePropertyIds } }).lean().exec();
        populatedUpdatedTenant.favorites = favoriteProperties;
    } else {
        populatedUpdatedTenant.favorites = [];
    }

    return NextResponse.json(populatedUpdatedTenant, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating tenant ${routeCognitoId}:`, error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating tenant: ${error.message}` }, { status: 500 });
  }
}