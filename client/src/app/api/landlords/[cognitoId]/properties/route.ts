// src/app/api/landlords/[cognitoId]/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property';
import Location from '@/lib/models/Location';
import Landlord from '@/lib/models/Landlord';
import { authenticateAndAuthorize, AuthenticatedUser } from '@/lib/authUtils'; // Ensure this path is correct

// ... (other interface definitions like ParsedPointCoordinates, LocationDocumentLean, LocationDataObject remain the same) ...

interface HandlerContext {
  params: {
    cognitoId: string;
  };
}

// IMPORTANT: Update this interface based on your Property schema
interface PropertyDocumentLean {
  _id: Types.ObjectId | string;
  // If Property links to Landlord via 'landlordCognitoId', change this:
  // landlordCognitoId: string;
  // If it's indeed still 'managerCognitoId' (repurposed for Landlord):
  managerCognitoId: string; // Or landlordCognitoId if your schema uses that
  locationId?: number;
  [key: string]: any;
}

interface PropertyWithPopulatedLocation extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string;
  location: LocationDataObject | null;
}


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
  request: NextRequest, // Added request parameter for authentication
  context: HandlerContext
) {
  console.log("--- GET /api/landlords/[cognitoId]/properties ---");
  await dbConnect();
  const { cognitoId: cognitoIdFromPath } = context.params; // Renamed for clarity

  // --- ADDED AUTHENTICATION & AUTHORIZATION ---
  const authResult = await authenticateAndAuthorize(request, ['landlord']);
  if (authResult instanceof NextResponse) {
    console.log('[API /landlords/:id/properties GET] Auth failed or returned response.');
    return authResult;
  }
  const authenticatedUser = authResult as AuthenticatedUser;
  console.log(`[API /landlords/:id/properties GET] Auth successful. User: "${authenticatedUser.id}", Role: "${authenticatedUser.role}"`);

  if (authenticatedUser.id !== cognitoIdFromPath) {
    console.warn(`[API /landlords/:id/properties GET] Forbidden: Auth user "${authenticatedUser.id}" trying to access properties for landlord "${cognitoIdFromPath}".`);
    return NextResponse.json({ message: 'Forbidden: You can only access your own properties.' }, { status: 403 });
  }
  console.log(`[API /landlords/:id/properties GET] Authorization check passed: Path ID matches token ID.`);
  // --- END AUTH ---

  if (!cognitoIdFromPath || typeof cognitoIdFromPath !== 'string' || cognitoIdFromPath.trim() === '') {
    console.warn('[API /landlords/:cognitoId/properties GET] Invalid or missing cognitoId in path.');
    return NextResponse.json({ message: 'Cognito ID is required and must be a non-empty string' }, { status: 400 });
  }

  console.log(`[API /landlords/:cognitoId/properties GET] Fetching properties for Landlord cognitoId: "${cognitoIdFromPath}"`);

  try {
    const landlordExists = await Landlord.exists({ cognitoId: cognitoIdFromPath });
    if (!landlordExists) {
        console.log(`[API /landlords/:cognitoId/properties GET] Landlord with cognitoId "${cognitoIdFromPath}" not found.`);
        return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }
    console.log(`[API /landlords/:cognitoId/properties GET] Landlord "${cognitoIdFromPath}" exists. Proceeding to fetch properties.`);

    // IMPORTANT: Adjust the field name here ('managerCognitoId' or 'landlordCognitoId')
    // based on your actual Property schema.
    const propertiesFromDb = await Property.find({ managerCognitoId: cognitoIdFromPath }) // Or { landlordCognitoId: cognitoIdFromPath }
      .lean()
      .exec() as unknown as PropertyDocumentLean[];

    if (!propertiesFromDb || propertiesFromDb.length === 0) {
      console.log(`[API /landlords/:cognitoId/properties GET] No properties found for Landlord cognitoId "${cognitoIdFromPath}".`);
      return NextResponse.json([] as PropertyWithPopulatedLocation[], { status: 200 });
    }

    console.log(`[API /landlords/:cognitoId/properties GET] Found ${propertiesFromDb.length} properties for Landlord "${cognitoIdFromPath}". Populating locations...`);

    const propertiesWithFormattedLocation: PropertyWithPopulatedLocation[] = await Promise.all(
      propertiesFromDb.map(async (property: PropertyDocumentLean): Promise<PropertyWithPopulatedLocation> => {
        let locationData: LocationDataObject | null = null;
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
          ...restOfProperty,
          _id: typeof _id === 'string' ? _id : _id.toString(),
          location: locationData,
        };
      })
    );

    console.log(`[API /landlords/:cognitoId/properties GET] Successfully processed properties for Landlord "${cognitoIdFromPath}".`);
    return NextResponse.json(propertiesWithFormattedLocation, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API /landlords/:cognitoId/properties GET] Error retrieving properties for Landlord ${cognitoIdFromPath}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving landlord properties: ${message}` }, { status: 500 });
  }
}