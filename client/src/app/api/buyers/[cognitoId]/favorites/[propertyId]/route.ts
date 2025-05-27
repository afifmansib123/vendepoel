// src/app/api/buyers/[cognitoId]/favorites/[propertyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Buyer from '@/lib/models/Buyer';     // Your Mongoose buyer model
import Property from '@/lib/models/Property'; // Your Mongoose Property model

async function getbuyerAndProperty(cognitoId: string, propertyIdStr: string) {
    const propertyIdNum = Number(propertyIdStr);
    if (isNaN(propertyIdNum)) {
        return { error: NextResponse.json({ message: 'Invalid Property ID format' }, { status: 400 }) };
    }

    const buyer = await Buyer.findOne({ cognitoId }).exec(); // Not .lean() as we will modify and save
    if (!buyer) {
        return { error: NextResponse.json({ message: 'buyer not found' }, { status: 404 }) };
    }

    // Check if property exists (optional, but good practice)
    const property = await Property.findOne({ id: propertyIdNum }).select('_id id').lean().exec();
    if (!property) {
        return { error: NextResponse.json({ message: 'Property not found' }, { status: 404 }) };
    }
    return { buyer, propertyId: propertyIdNum, propertyExists: true };
}

// --- POST Handler (Add Favorite Property) ---
export async function POST(
  request: NextRequest,
  { params }: { params: { cognitoId: string; propertyId: string } }
) {
  await dbConnect();
  const { cognitoId, propertyId: propertyIdStr } = params;

  const result = await getbuyerAndProperty(cognitoId, propertyIdStr);
  if (result.error) return result.error;
  const { buyer, propertyId } = result;

  try {
    // Add to favorites using $addToSet to prevent duplicates
    // Assumes buyer.favorites is an array of numeric Property IDs
    if (!buyer!.favorites.includes(propertyId!)) {
        buyer!.favorites.push(propertyId!); // Mongoose $addToSet equivalent for simple array
        await buyer!.save();
    } else {
        // Already a favorite, consider if this is an error or just a no-op
        // For simplicity, let's just return the buyer as if it was just added or already there.
    }

    // Repopulate favorites for the response to match GET /buyer/:cognitoId structure
    let populatedbuyer: any = buyer!.toObject(); // toObject to get a plain object
    if (populatedbuyer.favorites && populatedbuyer.favorites.length > 0) {
        const favoriteProperties = await Property.find({ id: { $in: populatedbuyer.favorites as number[] } }).lean().exec();
        populatedbuyer.favorites = favoriteProperties;
    } else {
        populatedbuyer.favorites = [];
    }

    return NextResponse.json(populatedbuyer, { status: 200 });

  } catch (error: any) {
    console.error(`Error adding favorite for buyer ${cognitoId}:`, error);
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

  const result = await getbuyerAndProperty(cognitoId, propertyIdStr);
  if (result.error) return result.error;
  const { buyer, propertyId } = result;

  try {
    // Remove from favorites using $pull
    // Assumes buyer.favorites is an array of numeric Property IDs
    const initialFavCount = buyer!.favorites.length;
    buyer!.favorites = buyer!.favorites.filter((favId : number) => favId !== propertyId!);

    if (buyer!.favorites.length < initialFavCount) { // Check if something was actually removed
        await buyer!.save();
    }

    // Repopulate favorites for the response
    let populatedbuyer: any = buyer!.toObject();
    if (populatedbuyer.favorites && populatedbuyer.favorites.length > 0) {
        const favoriteProperties = await Property.find({ id: { $in: populatedbuyer.favorites as number[] } }).lean().exec();
        populatedbuyer.favorites = favoriteProperties;
    } else {
        populatedbuyer.favorites = [];
    }

    return NextResponse.json(populatedbuyer, { status: 200 });

  } catch (error: any) {
    console.error(`Error removing favorite for buyer ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error removing favorite: ${error.message}` }, { status: 500 });
  }
}