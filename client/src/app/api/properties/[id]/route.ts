// src/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Adjusted Mongoose Property model
import Location from '@/lib/models/Location'; // Adjusted Mongoose Location model

// Helper for WKT parsing (can be moved to a utility file if used elsewhere)
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
    console.warn("Could not parse WKT:", wktString);
    return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // id comes from the folder name [id]
) {
  await dbConnect();
  const { id: propertyIdParam } = params; // Renaming for clarity
  console.log(`GET /api/properties/${propertyIdParam} called`);

  if (!propertyIdParam || isNaN(Number(propertyIdParam))) {
    return NextResponse.json({ message: 'Invalid property ID format provided.' }, { status: 400 });
  }
  const numericId = Number(propertyIdParam);

  try {
    const property = await Property.findOne({ id: numericId }).lean().exec();

    if (!property) {
      console.log(`Property with numeric ID ${numericId} not found.`);
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }
    console.log(`Found property with numeric ID ${numericId}:`, property.name);


    let populatedProperty: any = { ...property, location: null };

    if (property.locationId) { // Assuming 'locationId' is the numeric foreign key on Property
      const locationDoc = await Location.findOne({ id: property.locationId }).lean().exec();
      if (locationDoc) {
        console.log(`Found location with numeric ID ${property.locationId} for property.`);
        populatedProperty.location = {
          id: locationDoc.id,
          address: locationDoc.address,
          city: locationDoc.city,
          state: locationDoc.state,
          country: locationDoc.country,
          postalCode: locationDoc.postalCode,
          coordinates: parseWKTPoint(locationDoc.coordinates as string | undefined),
        };
      } else {
        console.warn(`Location with numeric ID ${property.locationId} not found for property ID ${numericId}.`);
      }
    } else {
        console.log(`Property ID ${numericId} does not have a locationId.`);
    }

    return NextResponse.json(populatedProperty, { status: 200 });

  } catch (error: any) {
    console.error(`GET /api/properties/${numericId} - Error:`, error);
    return NextResponse.json({ message: `Error retrieving property: ${error.message}` }, { status: 500 });
  }
}