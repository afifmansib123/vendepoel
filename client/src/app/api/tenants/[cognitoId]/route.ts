// src/app/api/tenants/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/lib/models/Tenant';     // Your Mongoose Tenant model
import Property from '@/lib/models/Property'; // Your Mongoose Property model

// --- GET Handler (Get Tenant by Cognito ID) ---
export async function GET(
  request: NextRequest,
  { params }: { params: { cognitoId: string } }
) {
  await dbConnect();
  const { cognitoId } = params;

  if (!cognitoId) {
    return NextResponse.json({ message: 'Cognito ID is required in path' }, { status: 400 });
  }

  try {
    const tenant = await Tenant.findOne({ cognitoId }).lean().exec();

    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

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
    // Similarly, if tenant.properties (associated/leased) needs population:
    // if (tenant.properties && Array.isArray(tenant.properties) && tenant.properties.length > 0) {
    //   const associatedPropertyIds = tenant.properties as number[];
    //   const associatedProperties = await Property.find({ id: { $in: associatedPropertyIds } }).lean().exec();
    //   populatedTenant.properties = associatedProperties;
    // } else {
    //   populatedTenant.properties = [];
    // }


    return NextResponse.json(populatedTenant, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching tenant ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error retrieving tenant: ${error.message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Tenant by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  { params }: { params: { cognitoId: string } }
) {
  await dbConnect();
  const { cognitoId } = params;

  if (!cognitoId) {
    return NextResponse.json({ message: 'Cognito ID is required in path' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, email, phoneNumber } = body; // Only pick allowed fields

    const updateData: { name?: string; email?: string; phoneNumber?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedTenant = await Tenant.findOneAndUpdate(
      { cognitoId },
      { $set: updateData },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    ).lean().exec();

    if (!updatedTenant) {
      return NextResponse.json({ message: 'Tenant not found or no changes made' }, { status: 404 });
    }

    // Similar to GET, if you need to return populated favorites after an update:
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
    console.error(`Error updating tenant ${cognitoId}:`, error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating tenant: ${error.message}` }, { status: 500 });
  }
}