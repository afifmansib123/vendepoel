// src/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // For ObjectId
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Adjusted Mongoose Property model
import Location from '@/lib/models/Location'; // Adjusted Mongoose Location model

// --- START Standard Type Definitions ---

// For the Next.js route handler context parameters
interface HandlerContext {
  params: {
    id: string; // The property ID from the URL path
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

// Interface for a Property document as fetched from the DB (.lean())
// Assumes 'id' is a numeric identifier and 'locationId' (numeric) exists
interface PropertyDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID for Property
  name?: string; // Assuming Property has a name field
  locationId?: number; // Numeric ID referencing a Location document
  // Add other known fields from your Property schema, e.g.:
  // description?: string;
  // pricePerMonth?: number;
  [key: string]: any;
}

// Interface for the formatted location data to be embedded in the property response
interface FormattedLocationForPropertyResponse {
  id: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates: ParsedPointCoordinates | null;
}

// Interface for the final Property object with populated location details for API response
interface PopulatedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; // Ensure _id is string for response
  location: FormattedLocationForPropertyResponse | null;
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
    console.warn("Could not parse WKT:", wktString);
    return null;
}

export async function GET(
  request: NextRequest,
  context: HandlerContext // Use defined HandlerContext
) {
  await dbConnect();
  const { id: propertyIdParam } = context.params; // Destructure from typed context
  console.log(`GET /api/properties/${propertyIdParam} called`);

  if (!propertyIdParam || isNaN(Number(propertyIdParam))) {
    return NextResponse.json({ message: 'Invalid property ID format provided.' }, { status: 400 });
  }
  const numericId = Number(propertyIdParam);

  try {
    const property = await Property.findOne({ id: numericId })
        .lean()
        .exec() as unknown as PropertyDocumentLean | null; // Assert type

    if (!property) {
      console.log(`Property with numeric ID ${numericId} not found.`);
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }
    console.log(`Found property with numeric ID ${numericId}:`, property.name || '(name not set)');

    // Prepare the response object, ensuring _id is string and location is initialized
    const { _id, locationId, ...restOfProperty } = property;
    const populatedPropertyResponse: PopulatedPropertyResponse = {
      ...restOfProperty,
      _id: typeof _id === 'string' ? _id : _id.toString(),
      id: property.id, // Ensure numeric id is carried over
      location: null, // Initialize location
    };


    if (locationId !== undefined && locationId !== null) {
      const locationDoc = await Location.findOne({ id: locationId })
        .lean()
        .exec() as unknown as LocationDocumentLean | null; // Assert type

      if (locationDoc) {
        console.log(`Found location with numeric ID ${locationId} for property.`);
        populatedPropertyResponse.location = {
          id: locationDoc.id,
          address: locationDoc.address,
          city: locationDoc.city,
          state: locationDoc.state,
          country: locationDoc.country,
          postalCode: locationDoc.postalCode,
          coordinates: parseWKTPoint(locationDoc.coordinates),
        };
      } else {
        console.warn(`Location with numeric ID ${locationId} not found for property ID ${numericId}.`);
      }
    } else {
        console.log(`Property ID ${numericId} does not have a locationId.`);
    }

    return NextResponse.json(populatedPropertyResponse, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error(`GET /api/properties/${numericId} - Error:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving property: ${message}` }, { status: 500 });
  }
}