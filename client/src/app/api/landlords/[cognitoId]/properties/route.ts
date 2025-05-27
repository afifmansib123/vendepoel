// src/app/api/landlords/[cognitoId]/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Your Mongoose Property model
import Location from '@/lib/models/Location'; // Your Mongoose Location model
import Landlord from '@/lib/models/Landlord'; // Changed from Manager to Landlord

// --- START Standard Type Definitions ---

// Interface for the Next.js route handler context parameters (remains the same)
interface HandlerContext {
  params: {
    cognitoId: string; // This cognitoId refers to the Landlord's cognitoId
  };
}

// Structure for coordinates parsed from WKT (remains the same)
interface ParsedPointCoordinates {
  longitude: number;
  latitude: number;
}

// Interface for a Location document as fetched from the DB (.lean()) (remains the same)
interface LocationDocumentLean {
  _id: Types.ObjectId | string;
  id: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: string;
  [key: string]: any;
}

// Interface for the formatted location data to be embedded in the property response (remains the same)
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
// Assumes 'managerCognitoId' still links Property to what is now a Landlord.
// If your Property model was updated to use 'landlordCognitoId', change this field name.
interface PropertyDocumentLean {
  _id: Types.ObjectId | string;
  managerCognitoId: string; // This field links Property to a Landlord (via cognitoId).
                           // It's assumed this field name in the Property model hasn't changed.
                           // If it has changed to 'landlordCognitoId' in Property schema, update here.
  locationId?: number;
  // Add other known fields from your Property schema
  [key: string]: any;
}

// Interface for the final Property object with populated location details for API response
// This will include 'managerCognitoId' (or 'landlordCognitoId' if changed above)
// from PropertyDocumentLean via Omit.
interface PropertyWithPopulatedLocation extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; // Ensure _id is string for response
  location: LocationDataObject | null;
}

// --- END Standard Type Definitions ---

// Helper for WKT parsing (remains the same)
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
  console.log("--- GET /api/landlords/[cognitoId]/properties ---"); // Renamed path
  await dbConnect();
  const { cognitoId } = context.params; // This is the Landlord's cognitoId

  if (!cognitoId || typeof cognitoId !== 'string' || cognitoId.trim() === '') {
    console.warn('[API /landlords/:cognitoId/properties GET] Invalid or missing cognitoId in path.');
    return NextResponse.json({ message: 'Cognito ID is required and must be a non-empty string' }, { status: 400 });
  }

  console.log(`[API /landlords/:cognitoId/properties GET] Fetching properties for Landlord cognitoId: "${cognitoId}"`);

  try {
    // Check if landlord exists
    const landlordExists = await Landlord.exists({ cognitoId }); // Changed from Manager to Landlord
    if (!landlordExists) {
        console.log(`[API /landlords/:cognitoId/properties GET] Landlord with cognitoId "${cognitoId}" not found.`);
        return NextResponse.json({ message: 'Landlord not found' }, { status: 404 }); // Renamed message
    }
    console.log(`[API /landlords/:cognitoId/properties GET] Landlord "${cognitoId}" exists. Proceeding to fetch properties.`);

    // Find properties where managerCognitoId matches the Landlord's cognitoId
    // IMPORTANT: This assumes the Property model still uses a field named 'managerCognitoId' to store the cognitoId
    // of the owning entity (which is now a Landlord). If you have updated your Property schema
    // to use 'landlordCognitoId', you MUST change 'managerCognitoId' to 'landlordCognitoId' in the query below.
    const propertiesFromDb = await Property.find({ managerCognitoId: cognitoId })
      .lean()
      .exec() as unknown as PropertyDocumentLean[];

    if (!propertiesFromDb || propertiesFromDb.length === 0) {
      console.log(`[API /landlords/:cognitoId/properties GET] No properties found for Landlord cognitoId "${cognitoId}".`);
      return NextResponse.json([] as PropertyWithPopulatedLocation[], { status: 200 });
    }

    console.log(`[API /landlords/:cognitoId/properties GET] Found ${propertiesFromDb.length} properties for Landlord "${cognitoId}". Populating locations...`);

    // Manually populate location for these properties
    const propertiesWithFormattedLocation: PropertyWithPopulatedLocation[] = await Promise.all(
      propertiesFromDb.map(async (property: PropertyDocumentLean): Promise<PropertyWithPopulatedLocation> => {
        let locationData: LocationDataObject | null = null;
        // 'managerCognitoId' (or 'landlordCognitoId' if changed in PropertyDocumentLean) will be part of restOfProperty
        const { locationId, _id, ...restOfProperty } = property;

        if (locationId !== undefined && locationId !== null) {
          const locationDoc = await Location.findOne({ id: locationId })
            .lean()
            .exec() as unknown as LocationDocumentLean | null;

          if (locationDoc) {
            locationData = {
              id: locationDoc.id,
              address: locationDoc.address,
              city: locationDoc.city,
              state: locationDoc.state,
              country: locationDoc.country,
              postalCode: locationDoc.postalCode,
              coordinates: parseWKTPoint(locationDoc.coordinates),
            };
          }
        }
        return {
          ...restOfProperty, // Includes fields like name, description, and managerCognitoId (or landlordCognitoId)
          _id: typeof _id === 'string' ? _id : _id.toString(),
          location: locationData,
        };
      })
    );

    console.log(`[API /landlords/:cognitoId/properties GET] Successfully processed properties for Landlord "${cognitoId}".`);
    return NextResponse.json(propertiesWithFormattedLocation, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API /landlords/:cognitoId/properties GET] Error retrieving properties for Landlord ${cognitoId}:`, error); // Renamed
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving landlord properties: ${message}` }, { status: 500 }); // Renamed
  }
}