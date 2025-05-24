// src/app/api/managers/[cognitoId]/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Your Mongoose Property model
import Location from '@/lib/models/Location'; // Your Mongoose Location model
import Manager from '@/lib/models/Manager';   // Your Mongoose Manager model

// Helper for WKT parsing (can be moved to a utility file)
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
    // Check if manager exists (optional, but good for a 404 if manager doesn't exist)
    const managerExists = await Manager.exists({ cognitoId });
    if (!managerExists) {
        return NextResponse.json({ message: 'Manager not found' }, { status: 404 });
    }

    // Find properties where managerCognitoId matches
    // This assumes Property model has 'managerCognitoId: String'
    const properties = await Property.find({ managerCognitoId: cognitoId }).lean().exec();

    if (!properties || properties.length === 0) {
      return NextResponse.json([], { status: 200 }); // No properties for this manager
    }

    // Manually populate location for these properties
    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property: any) => {
        let locationData = null;
        if (property.locationId) { // Assumes Property has numeric 'locationId'
          const locationDoc = await Location.findOne({ id: property.locationId }).lean().exec(); // Assumes Location has numeric 'id'
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

    return NextResponse.json(propertiesWithFormattedLocation, { status: 200 });

  } catch (error: any) {
    console.error(`Error retrieving properties for manager ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error retrieving manager properties: ${error.message}` }, { status: 500 });
  }
}