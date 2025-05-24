// src/app/api/tenants/[cognitoId]/favorites/[propertyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/lib/models/Tenant';     // Your Mongoose Tenant model
import Property from '@/lib/models/Property'; // Your Mongoose Property model

async function getTenantAndProperty(cognitoId: string, propertyIdStr: string) {
    const propertyIdNum = Number(propertyIdStr);
    if (isNaN(propertyIdNum)) {
        return { error: NextResponse.json({ message: 'Invalid Property ID format' }, { status: 400 }) };
    }

    const tenant = await Tenant.findOne({ cognitoId }).exec(); // Not .lean() as we will modify and save
    if (!tenant) {
        return { error: NextResponse.json({ message: 'Tenant not found' }, { status: 404 }) };
    }

    // Check if property exists (optional, but good practice)
    const property = await Property.findOne({ id: propertyIdNum }).select('_id id').lean().exec();
    if (!property) {
        return { error: NextResponse.json({ message: 'Property not found' }, { status: 404 }) };
    }
    return { tenant, propertyId: propertyIdNum, propertyExists: true };
}

// --- POST Handler (Add Favorite Property) ---
export async function POST(
  request: NextRequest,
  { params }: { params: { cognitoId: string; propertyId: string } }
) {
  await dbConnect();
  const { cognitoId, propertyId: propertyIdStr } = params;

  const result = await getTenantAndProperty(cognitoId, propertyIdStr);
  if (result.error) return result.error;
  const { tenant, propertyId } = result;

  try {
    // Add to favorites using $addToSet to prevent duplicates
    // Assumes tenant.favorites is an array of numeric Property IDs
    if (!tenant!.favorites.includes(propertyId!)) {
        tenant!.favorites.push(propertyId!); // Mongoose $addToSet equivalent for simple array
        await tenant!.save();
    } else {
        // Already a favorite, consider if this is an error or just a no-op
        // For simplicity, let's just return the tenant as if it was just added or already there.
    }

    // Repopulate favorites for the response to match GET /tenant/:cognitoId structure
    let populatedTenant: any = tenant!.toObject(); // toObject to get a plain object
    if (populatedTenant.favorites && populatedTenant.favorites.length > 0) {
        const favoriteProperties = await Property.find({ id: { $in: populatedTenant.favorites as number[] } }).lean().exec();
        populatedTenant.favorites = favoriteProperties;
    } else {
        populatedTenant.favorites = [];
    }

    return NextResponse.json(populatedTenant, { status: 200 });

  } catch (error: any) {
    console.error(`Error adding favorite for tenant ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error adding favorite: ${error.message}` }, { status: 500 });
  }
}

// --- DELETE Handler (Remove Favorite Property) ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: { cognitoId: string; propertyId: string } }
) {
  await dbConnect();
  const { cognitoId, propertyId: propertyIdStr } = params;

  const result = await getTenantAndProperty(cognitoId, propertyIdStr);
  if (result.error) return result.error;
  const { tenant, propertyId } = result;

  try {
    // Remove from favorites using $pull
    // Assumes tenant.favorites is an array of numeric Property IDs
    const initialFavCount = tenant!.favorites.length;
    tenant!.favorites = tenant!.favorites.filter(favId => favId !== propertyId!);

    if (tenant!.favorites.length < initialFavCount) { // Check if something was actually removed
        await tenant!.save();
    }

    // Repopulate favorites for the response
    let populatedTenant: any = tenant!.toObject();
    if (populatedTenant.favorites && populatedTenant.favorites.length > 0) {
        const favoriteProperties = await Property.find({ id: { $in: populatedTenant.favorites as number[] } }).lean().exec();
        populatedTenant.favorites = favoriteProperties;
    } else {
        populatedTenant.favorites = [];
    }

    return NextResponse.json(populatedTenant, { status: 200 });

  } catch (error: any) {
    console.error(`Error removing favorite for tenant ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error removing favorite: ${error.message}` }, { status: 500 });
  }
}