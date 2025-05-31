// src/app/api/seller-properties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import SellerProperty from '@/lib/models/SellerProperty'; // Your SellerProperty model
import Location from '@/lib/models/Location';             // Your Location model

// --- Re-usable Type Definitions (can be moved to a shared types file later) ---

interface ParsedPointCoordinates {
  longitude: number;
  latitude: number;
}

interface FormattedLocationForResponse {
  id: number;
  address?: string; // Made optional to match common patterns
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates: ParsedPointCoordinates | null;
}

// Interface for SellerProperty document from DB (includes all fields)
// This should closely match your SellerProperty Mongoose schema.
interface SellerPropertyDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Numeric ID
  name: string;
  description: string;
  salePrice: number;
  propertyType: string;
  propertyStatus: string;
  beds: number;
  baths: number;
  squareFeet: number;
  yearBuilt?: number | null;
  HOAFees?: number | null;
  amenities: string[];
  highlights: string[];
  openHouseDates?: string[]; // Stored as array of strings
  sellerNotes?: string;
  allowBuyerApplications: boolean;
  preferredFinancingInfo?: string;
  insuranceRecommendation?: string;
  sellerCognitoId: string;
  photoUrls: string[];
  agreementDocumentUrl?: string;
  locationId: number; // Foreign key to Location
  postedDate: Date;
  createdAt: Date;
  updatedAt: Date;
  buyerInquiries?: any[]; // Define more specifically if possible
  // Add any other fields from your SellerProperty schema
  [key: string]: any;
}

// For the API response of a single property (with populated location)
interface SingleSellerPropertyResponse extends Omit<SellerPropertyDocumentLean, '_id' | 'locationId'> {
  _id: string;
  location: FormattedLocationForResponse | null; // Location can be null if not found
}

// Context for dynamic route parameters
interface HandlerContext {
  params: {
    id: string; // The property ID from the URL path
  };
}
// --- End Type Definitions ---

// Helper function to parse WKT
function parseWKTPointString(wktString: string | null | undefined): ParsedPointCoordinates | null {
    if (!wktString || typeof wktString !== 'string') return null;
    const match = wktString.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match && match.length === 3) {
        const longitude = parseFloat(match[1]);
        const latitude = parseFloat(match[2]);
        if (!isNaN(longitude) && !isNaN(latitude)) {
            return { longitude, latitude };
        }
    }
    console.warn("Could not parse WKT for location coordinates:", wktString);
    return null;
}

export async function GET(
  request: NextRequest,
  context: HandlerContext
) {
  await dbConnect();
  const { id: propertyIdParam } = context.params;
  console.log(`GET /api/seller-properties/${propertyIdParam} called`);

  if (!propertyIdParam) {
    return NextResponse.json({ message: "Property ID parameter is missing." }, { status: 400 });
  }

  const numericId = Number(propertyIdParam);
  if (isNaN(numericId)) {
    return NextResponse.json({ message: "Invalid property ID format. Must be a number." }, { status: 400 });
  }

  try {
    const property = await SellerProperty.findOne({ id: numericId })
      .lean()
      .exec() as SellerPropertyDocumentLean | null;

    if (!property) {
      console.log(`SellerProperty with numeric ID ${numericId} not found.`);
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }
    console.log(`Found SellerProperty with ID ${numericId}: ${property.name}`);

    let formattedLocation: FormattedLocationForResponse | null = null;
    if (property.locationId) {
      const locationDoc = await Location.findOne({ id: property.locationId })
        .lean()
        .exec() as { id: number; address?: string; city?: string; state?: string; country?: string; postalCode?: string; coordinates?: string; [key: string]: any; } | null;

      if (locationDoc) {
        formattedLocation = {
          id: locationDoc.id,
          address: locationDoc.address,
          city: locationDoc.city,
          state: locationDoc.state,
          country: locationDoc.country,
          postalCode: locationDoc.postalCode,
          coordinates: parseWKTPointString(locationDoc.coordinates),
        };
      } else {
        console.warn(`Location with ID ${property.locationId} not found for SellerProperty ID ${numericId}.`);
      }
    } else {
        console.log(`SellerProperty ID ${numericId} does not have a locationId.`);
    }

    // Prepare the response object
    const { _id, locationId, ...restOfProperty } = property;
    const responseData: SingleSellerPropertyResponse = {
      ...restOfProperty,
      _id: typeof _id === 'string' ? _id : _id.toString(),
      location: formattedLocation,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: unknown) {
    console.error(`GET /api/seller-properties/${numericId} - Error:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving property: ${message}` }, { status: 500 });
  }
}