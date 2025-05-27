// src/app/api/buyers/[cognitoId]/current-residences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Your Mongoose Property model
import Location from '@/lib/models/Location'; // Your Mongoose Location model
import Lease from '@/lib/models/Lease';       // Your Mongoose Lease model
import Buyer from '@/lib/models/Buyer';     // Your Mongoose buyer model
import mongoose from 'mongoose';

interface buyer{
_id : mongoose.ObjectId;
cognitoId?: string;
}

interface LocationDoc {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: string; // The WKT string, optional
  [key: string]: any; // For other potential fields
}

// Helper for WKT parsing
function parseWKTPoint(wktString: string | null | undefined): { longitude: number; latitude: number } | null {
    if (!wktString || typeof wktString !== 'string') return null;
    const match = wktString.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match && match.length === 3) {
        const longitude = parseFloat(match[1]);
        const latitude = parseFloat(match[2]);
        if (!isNaN(longitude) && !isNaN(latitude)) {
            return { longitude, latitude };
        }
    }
    return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { cognitoId: string } }
) {
  await dbConnect();
  const { cognitoId } = params;

  if (!cognitoId) {
    return NextResponse.json({ message: 'Cognito ID is required' }, { status: 400 });
  }

  try {
    // First, find the buyer's MongoDB _id using their cognitoId
    const buyer = await Buyer.findOne({ cognitoId }).select('_id').lean().exec();
    if (!buyer) {
      return NextResponse.json({ message: 'buyer not found' }, { status: 404 });
    }
    const buyerObjectId = buyer; // This is the MongoDB ObjectId

    // Find active leases for this buyer
    // An "active" lease could be defined as startDate <= now < endDate
    const now = new Date();
    const activeLeases = await Lease.find({
      buyer: buyerObjectId, // Assuming Lease.buyer stores buyer's MongoDB _id
      startDate: { $lte: now },
      endDate: { $gt: now }
    }).select('propertyId').lean().exec(); // Select only propertyId (numeric)

    if (!activeLeases || activeLeases.length === 0) {
      return NextResponse.json([], { status: 200 }); // No current residences
    }

    const propertyIds = activeLeases.map(lease => lease.propertyId as number);

    // Find properties associated with these active leases using numeric 'id'
    const properties = await Property.find({
      id: { $in: propertyIds }
    }).lean().exec();

    // Manually populate location for these properties
    const residencesWithFormattedLocation = await Promise.all(
      properties.map(async (property: any) => {
        let locationData = null;
        if (property.locationId) {
          const locationDoc = await Location.findOne({ id: property.locationId }).lean().exec() as LocationDoc | null;
          if (locationDoc) {
            locationData = {
              id: locationDoc.id,
              address: locationDoc.address,
              city: locationDoc.city,
              state: locationDoc.state,
              country: locationDoc.country,
              postalCode: locationDoc.postalCode,
              coordinates: parseWKTPoint(locationDoc.coordinates as string | undefined),
            };
          }
        }
        return { ...property, location: locationData };
      })
    );

    return NextResponse.json(residencesWithFormattedLocation, { status: 200 });

  } catch (error: any) {
    console.error(`Error retrieving current residences for buyer ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error retrieving current residences: ${error.message}` }, { status: 500 });
  }
}