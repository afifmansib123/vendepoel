// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Your Mongoose Property model
import Location from '@/lib/models/Location'; // Your Mongoose Location model
import { S3Client, PutObjectCommandOutput } from "@aws-sdk/client-s3"; // Import specific output type if needed
import { Upload } from "@aws-sdk/lib-storage";
import axios, { AxiosResponse } from 'axios'; // For typing Axios response

// --- START Standard Type Definitions ---

// Utility Types
interface ParsedPointCoordinates {
  longitude: number;
  latitude: number;
}

// --- Model-Specific Lean Document Interfaces (as fetched from DB) ---
interface LocationDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: string; // WKT string
  [key: string]: any;
}

interface PropertyDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID
  name?: string;
  description?: string;
  pricePerMonth?: number;
  securityDeposit?: number;
  applicationFee?: number;
  amenities?: string[];
  highlights?: string[];
  isPetsAllowed?: boolean;
  isParkingIncluded?: boolean;
  beds?: number;
  baths?: number; // Can be float, e.g., 1.5
  squareFeet?: number;
  propertyType?: string; // e.g., "Apartment", "House"
  photoUrls?: string[];
  locationId?: number; // Numeric ID referencing Location
  managerCognitoId?: string;
  // Add other property fields as they exist in your schema
  [key: string]: any;
}

// --- Interfaces for GET Request and Response ---
// Type for propertyFilters object in GET
interface PropertyQueryFilters {
  id?: { $in: number[] };
  pricePerMonth?: { $gte?: number; $lte?: number };
  beds?: { $gte: number };
  baths?: { $gte: number };
  squareFeet?: { $gte?: number; $lte?: number };
  propertyType?: string;
  amenities?: { $all: string[] };
  [key: string]: any; // Allow other potential filters
}

// For the Location part of the GET response
interface FormattedLocationForPropertyResponse {
  id: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates: ParsedPointCoordinates | null;
}

// For each property in the GET response list
interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; // Ensure string for response
  location: FormattedLocationForPropertyResponse | null;
}


// --- Interfaces for POST Request and Response ---
// Data for new Location creation
interface NewLocationData {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: string; // WKT string
}

// Data extracted from form for new Property (before saving)
interface NewPropertyFormData {
  name?: string;
  description?: string;
  pricePerMonth?: number;
  securityDeposit?: number;
  applicationFee?: number;
  amenities: string[];
  highlights: string[];
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  beds?: number;
  baths?: number;
  squareFeet?: number;
  propertyType?: string;
}

// Data for creating a new Property document (includes IDs and S3 URLs)
interface NewPropertyDocumentData extends NewPropertyFormData {
  id: number;
  photoUrls: string[];
  locationId: number;
  managerCognitoId: string;
}

// For the response of POST after creating property and location
interface CreatedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
    _id: string; // Ensure string
    location: { // Location part of the POST response
        id: number;
        address: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        coordinates: ParsedPointCoordinates; // Return parsed coordinates
    };
}

// Type for Nominatim Geocoding API Response
interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: string[];
    lat: string; // Latitude as string
    lon: string; // Longitude as string
    display_name: string;
    class: string;
    type: string;
    importance: number;
    icon?: string;
}

// Mongoose Validation Error (reusable)
interface MongooseValidationError {
  name: 'ValidationError';
  message: string;
  errors: { [key: string]: { message: string; [key: string]: any } };
}
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}
// --- END Standard Type Definitions ---

// --- Helper Functions (already well-typed for the most part) ---
const toNumber = (val: string | undefined | null): number | undefined => {
  if (val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

const parseWKTPoint = (wktString: string | null | undefined): ParsedPointCoordinates | null => {
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

const getNumericFormValue = (formData: FormData, key: string, isFloat: boolean = false): number | undefined => {
    const value = formData.get(key) as string | null; // FormData values are string or File
    if (value === null || value === '') return undefined;
    const num = isFloat ? parseFloat(value) : parseInt(value, 10);
    return isNaN(num) ? undefined : num;
};

const getBooleanFormValue = (formData: FormData, key: string): boolean => {
    const value = formData.get(key) as string | null;
    return value === 'true'; // Strict check for 'true' string
};

// --- S3 Configuration ---
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// --- GET Handler (List Properties) ---
export async function GET(request: NextRequest) {
  await dbConnect();
  console.log("GET /api/properties called");

  try {
    const searchParams = request.nextUrl.searchParams;
    console.log("Search Params:", Object.fromEntries(searchParams.entries()));

    const favoriteIdsParam = searchParams.get('favoriteIds');
    const priceMin = toNumber(searchParams.get('priceMin'));
    const priceMax = toNumber(searchParams.get('priceMax'));
    const bedsStr = searchParams.get('beds');
    const bathsStr = searchParams.get('baths');
    const propertyType = searchParams.get('propertyType');
    const squareFeetMin = toNumber(searchParams.get('squareFeetMin'));
    const squareFeetMax = toNumber(searchParams.get('squareFeetMax'));
    const amenitiesParam = searchParams.get('amenities');

    const propertyFilters: PropertyQueryFilters = {}; // Use defined type

    if (favoriteIdsParam) {
      const favoriteIdsArray = favoriteIdsParam.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
      if (favoriteIdsArray.length > 0) propertyFilters.id = { $in: favoriteIdsArray };
    }
    if (priceMin !== undefined) propertyFilters.pricePerMonth = { ...propertyFilters.pricePerMonth, $gte: priceMin };
    if (priceMax !== undefined) propertyFilters.pricePerMonth = { ...propertyFilters.pricePerMonth, $lte: priceMax };

    if (bedsStr && bedsStr !== 'any') {
        const beds = Number(bedsStr);
        if (!isNaN(beds)) propertyFilters.beds = { $gte: beds };
    }
    if (bathsStr && bathsStr !== 'any') {
        const baths = Number(bathsStr); // baths can be float (e.g., 1.5)
        if (!isNaN(baths)) propertyFilters.baths = { $gte: baths };
    }
    if (squareFeetMin !== undefined) propertyFilters.squareFeet = { ...propertyFilters.squareFeet, $gte: squareFeetMin };
    if (squareFeetMax !== undefined) propertyFilters.squareFeet = { ...propertyFilters.squareFeet, $lte: squareFeetMax };
    if (propertyType && propertyType !== 'any') propertyFilters.propertyType = propertyType;

    if (amenitiesParam && amenitiesParam !== 'any') {
      const amenitiesArray = amenitiesParam.split(',').map(a => a.trim()).filter(a => a.length > 0);
      if (amenitiesArray.length > 0) propertyFilters.amenities = { $all: amenitiesArray };
    }

    console.log("Constructed Property Filters:", JSON.stringify(propertyFilters));
    const propertiesFromDB = await Property.find(propertyFilters)
        .lean()
        .exec() as unknown as PropertyDocumentLean[]; // Assert type
    console.log(`Found ${propertiesFromDB.length} properties matching filters.`);

    const populatedProperties: FormattedPropertyResponse[] = await Promise.all(
      propertiesFromDB.map(async (prop: PropertyDocumentLean): Promise<FormattedPropertyResponse> => {
        let locationData: FormattedLocationForPropertyResponse | null = null;
        const { _id, locationId, ...restOfProp } = prop;

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
          ...restOfProp,
          _id: typeof _id === 'string' ? _id : _id.toString(),
          id: prop.id, // Ensure numeric id is carried over
          location: locationData,
        };
      })
    );

    return NextResponse.json(populatedProperties, { status: 200 });
  } catch (error: unknown) {
    console.error('GET /api/properties - Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving properties: ${message}` }, { status: 500 });
  }
}

// --- POST Handler (Create Property) ---
export async function POST(request: NextRequest) {
  await dbConnect();
  console.log("POST /api/properties called");

  if (!S3_BUCKET_NAME || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("S3 environment variables missing or incomplete.");
    return NextResponse.json({ message: 'Server configuration error for file uploads.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    // .getAll() returns (File | string)[], so cast to File[] is an assertion
    const files = formData.getAll('photos') as File[];

    const address = formData.get('address') as string | null;
    const city = formData.get('city') as string | null;
    const state = formData.get('state') as string | null;
    const country = formData.get('country') as string | null;
    const postalCode = formData.get('postalCode') as string | null;
    const managerCognitoId = formData.get('managerCognitoId') as string | null;

    if (!address || !city || !state || !country || !postalCode || !managerCognitoId) {
        return NextResponse.json({ message: 'Missing required location fields or managerCognitoId.' }, { status: 400 });
    }

    const validPhotoUrls: string[] = [];
    if (files && files.length > 0) {
        const uploadPromises = files.map(async (file: File) => { // Type file explicitly
            if (!file.name || file.size === 0) return null;
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const uploadParams = {
                Bucket: S3_BUCKET_NAME!,
                Key: `properties/${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
                Body: fileBuffer,
                ContentType: file.type,
            };
            try {
                const upload = new Upload({ client: s3Client, params: uploadParams });
                const result = await upload.done(); // result type can be S3.CompleteMultipartUploadOutput
                return (result as { Location?: string }).Location; // Extract Location, which might be on result
            } catch (s3Error) {
                console.error("S3 individual file upload Error:", s3Error);
                return null;
            }
        });
        const results = await Promise.all(uploadPromises);
        results.forEach(url => { if (url) validPhotoUrls.push(url); });
    }
    console.log("Uploaded photo URLs:", validPhotoUrls);

    let longitude = 0, latitude = 0; // Default to 0,0 if geocoding fails
    try {
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
            street: address, city, country, postalcode: postalCode, format: "json", limit: "1",
        }).toString()}`;
        console.log("Geocoding URL:", geocodingUrl);
        const geocodingResponse: AxiosResponse<NominatimResult[]> = await axios.get(geocodingUrl, { // Type the response
            headers: { 'User-Agent': 'RealEstateApp/1.0 (dev@example.com)' },
        });
        if (geocodingResponse.data && geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat) {
            longitude = parseFloat(geocodingResponse.data[0].lon);
            latitude = parseFloat(geocodingResponse.data[0].lat);
            console.log(`Geocoded to: Lon ${longitude}, Lat ${latitude}`);
        } else {
            console.warn("Geocoding failed or no results for:", address, city);
        }
    } catch (geoError: unknown) {
        const message = geoError instanceof Error ? geoError.message : "Unknown geocoding error";
        console.error("Geocoding API error:", message);
    }
    const wktCoordinates = `POINT(${longitude} ${latitude})`;

    const lastLocation = await Location.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextLocationId = (lastLocation && typeof lastLocation.id === 'number' ? lastLocation.id : 0) + 1;

    const newLocationData: NewLocationData = {
        id: nextLocationId, address, city, state, country, postalCode,
        coordinates: wktCoordinates,
    };
    const newLocation = new Location(newLocationData);
    await newLocation.save(); // newLocation is a Mongoose Document
    console.log("New Location saved with ID:", newLocation.id);

    const propertyDataFromForm: NewPropertyFormData = {
        name: formData.get('name') as string | undefined, // Cast as string | undefined
        description: formData.get('description') as string | undefined,
        pricePerMonth: getNumericFormValue(formData, 'pricePerMonth', true),
        securityDeposit: getNumericFormValue(formData, 'securityDeposit', true),
        applicationFee: getNumericFormValue(formData, 'applicationFee', true),
        amenities: (formData.get('amenities') as string | null)?.split(',').map(s => s.trim()).filter(s => s) || [],
        highlights: (formData.get('highlights') as string | null)?.split(',').map(s => s.trim()).filter(s => s) || [],
        isPetsAllowed: getBooleanFormValue(formData, 'isPetsAllowed'),
        isParkingIncluded: getBooleanFormValue(formData, 'isParkingIncluded'),
        beds: getNumericFormValue(formData, 'beds'),
        baths: getNumericFormValue(formData, 'baths', true),
        squareFeet: getNumericFormValue(formData, 'squareFeet'),
        propertyType: formData.get('propertyType') as string | undefined,
    };

    if (!propertyDataFromForm.name || propertyDataFromForm.pricePerMonth === undefined || propertyDataFromForm.beds === undefined || propertyDataFromForm.baths === undefined || propertyDataFromForm.squareFeet === undefined || !propertyDataFromForm.propertyType) {
        return NextResponse.json({ message: 'Missing required property data fields (name, price, beds, baths, sqft, type).' }, { status: 400 });
    }

    const lastProperty = await Property.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextPropertyId = (lastProperty && typeof lastProperty.id === 'number' ? lastProperty.id : 0) + 1;

    const newPropertyDocData: NewPropertyDocumentData = {
      id: nextPropertyId,
      ...propertyDataFromForm, // This is now typed as NewPropertyFormData
      name: propertyDataFromForm.name, // Explicitly include to satisfy required fields if any
      pricePerMonth: propertyDataFromForm.pricePerMonth,
      beds: propertyDataFromForm.beds,
      baths: propertyDataFromForm.baths,
      squareFeet: propertyDataFromForm.squareFeet,
      propertyType: propertyDataFromForm.propertyType,
      photoUrls: validPhotoUrls,
      locationId: newLocation.id, // Access numeric id from Mongoose Document
      managerCognitoId: managerCognitoId,
    };
    const newPropertyDoc = new Property(newPropertyDocData);
    await newPropertyDoc.save(); // newPropertyDoc is a Mongoose Document
    console.log("New Property saved with ID:", newPropertyDoc.id);

    // Convert Mongoose document to plain object for response
    const savedPropertyObject = newPropertyDoc.toObject({ virtuals: true }) as PropertyDocumentLean;
    const { _id: prop_Id, locationId: propLocationId, ...restOfSavedProp } = savedPropertyObject;

    const propertyToReturn: CreatedPropertyResponse = {
        ...restOfSavedProp,
        _id: typeof prop_Id === 'string' ? prop_Id : prop_Id.toString(),
        id: savedPropertyObject.id, // Ensure numeric id is present
        location: { // Construct location part of response
            id: newLocation.id, address, city, state, country, postalCode,
            coordinates: { longitude, latitude } // Use the geocoded (or default) values
        },
    };

    return NextResponse.json(propertyToReturn, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/properties - Error:', error);
    if (isMongooseValidationError(error)) {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error creating property: ${message}` }, { status: 500 });
  }
}