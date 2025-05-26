// src/app/api/managers/[cognitoId]/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Your Mongoose Property model
import Location from '@/lib/models/Location'; // Your Mongoose Location model
import Manager from '@/lib/models/Manager';   // Your Mongoose Manager model

// --- START Standard Type Definitions ---

// Interface for the Next.js route handler context parameters
interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// Structure for coordinates parsed from WKT
interface ParsedPointCoordinates {
  longitude: number;
  latitude: number;
}

// Interface for a Location document as fetched from the DB (.lean())
// Assumes 'id' is a numeric identifier for Location, distinct from Mongoose '_id'
interface LocationDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID for Location
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: string; // WKT string from the database
  [key: string]: any;
}

// Interface for the formatted location data to be embedded in the property response
interface LocationDataObject {
  id: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates: ParsedPointCoordinates | null;
}

// Interface for a Property document as fetched from the DB (.lean())
// Assumes 'managerCognitoId' and 'locationId' (numeric) exist on the Property model
interface PropertyDocumentLean {
  _id: Types.ObjectId | string;
  managerCognitoId: string;
  locationId?: number; // Numeric ID referencing a Location document
  // Add other known fields from your Property schema, e.g.:
  // name?: string;
  // description?: string;
  [key: string]: any;
}

// Interface for the final Property object with populated location details for API response
interface PropertyWithPopulatedLocation extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; // Ensure _id is string for response
  location: LocationDataObject | null;
}

// --- END Standard Type Definitions ---

// Helper for WKT parsing (already well-typed)
function parseWKTPoint(wktString: string | null | undefined): ParsedPointCoordinates | null {
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
  context: HandlerContext // Use defined HandlerContext
) {
  await dbConnect();
  const { cognitoId } = context.params; // Destructure from typed context

  if (!cognitoId || typeof cognitoId !== 'string' || cognitoId.trim() === '') {
    return NextResponse.json({ message: 'Cognito ID is required and must be a non-empty string' }, { status: 400 });
  }

  try {
    // Check if manager exists
    const managerExists = await Manager.exists({ cognitoId }); // .exists() returns {_id: ...} or null
    if (!managerExists) { // If null, manager does not exist
        return NextResponse.json({ message: 'Manager not found' }, { status: 404 });
    }

    // Find properties where managerCognitoId matches
    const propertiesFromDb = await Property.find({ managerCognitoId: cognitoId })
      .lean()
      .exec() as unknown as PropertyDocumentLean[]; // Assert type

    if (!propertiesFromDb || propertiesFromDb.length === 0) {
      return NextResponse.json([] as PropertyWithPopulatedLocation[], { status: 200 }); // Return empty typed array
    }

    // Manually populate location for these properties
    const propertiesWithFormattedLocation: PropertyWithPopulatedLocation[] = await Promise.all(
      propertiesFromDb.map(async (property: PropertyDocumentLean): Promise<PropertyWithPopulatedLocation> => {
        let locationData: LocationDataObject | null = null;
        const { locationId, _id, ...restOfProperty } = property; // Destructure to separate locationId and prepare rest

        if (locationId !== undefined && locationId !== null) { // Check if locationId exists
          const locationDoc = await Location.findOne({ id: locationId }) // Assumes Location has numeric 'id'
            .lean()
            .exec() as unknown as LocationDocumentLean | null; // Assert type

          if (locationDoc) {
            locationData = {
              id: locationDoc.id,
              address: locationDoc.address,
              city: locationDoc.city,
              state: locationDoc.state,
              country: locationDoc.country,
              postalCode: locationDoc.postalCode,
              coordinates: parseWKTPoint(locationDoc.coordinates), // `coordinates` is already string | undefined from LocationDocumentLean
            };
          }
        }
        return {
          ...restOfProperty,
          _id: typeof _id === 'string' ? _id : _id.toString(), // Ensure _id is string
          location: locationData,
        };
      })
    );

    return NextResponse.json(propertiesWithFormattedLocation, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error(`Error retrieving properties for manager ${cognitoId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving manager properties: ${message}` }, { status: 500 });
  }
}