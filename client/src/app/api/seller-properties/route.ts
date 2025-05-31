// src/app/api/seller-properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // Keep for _id typing
import dbConnect from '@/lib/dbConnect';
import SellerProperty from '@/lib/models/SellerProperty'; // Your simplified Mongoose model
import Location from '@/lib/models/Location';
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios, { AxiosResponse } from 'axios';

// --- Type Definitions (largely same, but schema enum values are now just strings) ---

interface NominatimResult {
    lat: string;
    lon: string;
    [key: string]: any;
}

interface FormattedLocationForResponse {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: { longitude: number; latitude: number } | null;
}

// Interface for data from frontend (matches SellerPropertyFormData keys)
// Used for constructing the object to save.
interface SellerPropertyDataFromFrontend {
  name: string; description: string; salePrice: number; propertyType: string; propertyStatus: string;
  beds: number; baths: number; squareFeet: number; yearBuilt?: number | null; HOAFees?: number | null;
  amenities: string[]; highlights: string[];
  openHouseDates?: string; // Frontend processes this into string[] for FormData
  sellerNotes?: string; allowBuyerApplications: boolean;
  preferredFinancingInfo?: string; insuranceRecommendation?: string;
  address: string; city: string; state: string; country: string; postalCode: string;
  // sellerCognitoId is added separately from auth
}


// For the SellerProperty document after saving
interface SavedSellerPropertyDocument extends SellerPropertyDataFromFrontend {
  _id: Types.ObjectId | string;
  id: number;
  locationId: number;
  sellerCognitoId: string;
  photoUrls: string[];
  agreementDocumentUrl?: string;
  postedDate: Date;
  createdAt: Date;
  updatedAt: Date;
  buyerInquiries: any[]; // Or a more specific type
  openHouseDates: string[]; // Schema stores as array of strings now
}

// For the final API response
interface CreatedSellerPropertyResponse extends Omit<SavedSellerPropertyDocument, '_id' | 'locationId' | 'photos' | 'agreementDocument'> {
  _id: string;
  location: FormattedLocationForResponse;
}


interface MongooseValidationError {
  name: 'ValidationError'; message: string;
  errors: { [key: string]: { message: string; [key: string]: any } };
}
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});
const S3_BUCKET_NAME = process.env.S3_SELLER_PROPERTY_BUCKET_NAME || process.env.S3_BUCKET_NAME!;


const getBooleanFormValue = (formData: FormData, key: string, defaultValue: boolean = false): boolean => {
    const value = formData.get(key) as string | null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
};

const getNumericFormValue = (formData: FormData, key: string, isFloat: boolean = false): number | undefined => {
    const value = formData.get(key) as string | null;
    if (value === null || value.trim() === '') return undefined;
    const num = isFloat ? parseFloat(value) : parseInt(value, 10);
    return isNaN(num) ? undefined : num;
};


export async function POST(request: NextRequest) {
  await dbConnect();
  console.log("POST /api/seller-properties called (simplified)");

  if (!S3_BUCKET_NAME || !s3Client.config.region) {
    console.error("S3 environment variables missing or incomplete.");
    return NextResponse.json({ message: 'Server configuration error for file uploads.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();

    // Extract and Parse Data from FormData
    // Frontend pre-processing ensures these fields are present and have placeholder values.
    // Mongoose `required:true` will catch truly missing fields if frontend logic fails.
    const dataForDb: Omit<SavedSellerPropertyDocument, '_id' | 'id' | 'locationId' | 'photoUrls' | 'agreementDocumentUrl' | 'postedDate' | 'createdAt' | 'updatedAt' | 'buyerInquiries' | 'sellerCognitoId'> & { sellerCognitoId: string } = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      salePrice: getNumericFormValue(formData, 'salePrice', true)!,
      propertyType: formData.get('propertyType') as string, // Will be stored as sent
      propertyStatus: formData.get('propertyStatus') as string, // Will be stored as sent
      beds: getNumericFormValue(formData, 'beds')!,
      baths: getNumericFormValue(formData, 'baths', true)!,
      squareFeet: getNumericFormValue(formData, 'squareFeet')!,
      yearBuilt: getNumericFormValue(formData, 'yearBuilt'), // Optional
      HOAFees: getNumericFormValue(formData, 'HOAFees', true),   // Optional
      amenities: JSON.parse(formData.get('amenities') as string || '[]'), // Stored as array of strings
      highlights: JSON.parse(formData.get('highlights') as string || '[]'), // Stored as array of strings
      openHouseDates: JSON.parse(formData.get('openHouseDates') as string || '[]'), // Stored as array of strings
      sellerNotes: formData.get('sellerNotes') as string | undefined,
      allowBuyerApplications: getBooleanFormValue(formData, 'allowBuyerApplications', true),
      preferredFinancingInfo: formData.get('preferredFinancingInfo') as string | undefined,
      insuranceRecommendation: formData.get('insuranceRecommendation') as string | undefined,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      country: formData.get('country') as string,
      postalCode: formData.get('postalCode') as string,
      sellerCognitoId: formData.get('sellerCognitoId') as string, // Crucial for linking
    };

    if (!dataForDb.sellerCognitoId) {
        return NextResponse.json({ message: 'Seller authentication ID is missing from form data.' }, { status: 400 });
    }

    // File Uploads to S3 (same logic as before)
    const photoFiles = formData.getAll('photos') as File[];
    const agreementFile = formData.get('agreementDocument') as File | null;
    const uploadedPhotoUrls: string[] = [];
    let agreementDocumentUrl: string | undefined;

    for (const file of photoFiles) {
        if (file.size > 0) {
          const uploadParams = {
            Bucket: S3_BUCKET_NAME,
            Key: `seller-properties/photos/${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
            Body: Buffer.from(await file.arrayBuffer()),
            ContentType: file.type,
          };
          const upload = new Upload({ client: s3Client, params: uploadParams });
          const result = await upload.done();
          if ((result as { Location?: string }).Location) {
            uploadedPhotoUrls.push((result as { Location: string }).Location);
          }
        }
      }

    if (agreementFile && agreementFile.size > 0) {
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: `seller-properties/agreements/${Date.now()}-${agreementFile.name.replace(/\s+/g, '_')}`,
        Body: Buffer.from(await agreementFile.arrayBuffer()),
        ContentType: agreementFile.type,
      };
      const upload = new Upload({ client: s3Client, params: uploadParams });
      const result = await upload.done();
      if ((result as { Location?: string }).Location) {
        agreementDocumentUrl = (result as { Location: string }).Location;
      }
    }

    // Geocoding and Location Handling (same logic as before)
    let longitude = 0, latitude = 0;
    try {
      const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        street: dataForDb.address, city: dataForDb.city, country: dataForDb.country,
        postalcode: dataForDb.postalCode, format: "json", limit: "1",
      }).toString()}`;
      const geocodingResponse: AxiosResponse<NominatimResult[]> = await axios.get(geocodingUrl, {
        headers: { 'User-Agent': 'YourAppName/1.0 (yourcontact@example.com)' }, // Be a good API citizen
      });
      if (geocodingResponse.data && geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat) {
        longitude = parseFloat(geocodingResponse.data[0].lon);
        latitude = parseFloat(geocodingResponse.data[0].lat);
      }
    } catch (geoError: any) {
      console.error("Geocoding API error:", geoError.message);
    }
    const wktCoordinates = `POINT(${longitude} ${latitude})`;

    const lastLocation = await Location.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextLocationId = (lastLocation?.id ?? 0) + 1;

    const newLocation = new Location({
      id: nextLocationId, address: dataForDb.address, city: dataForDb.city, state: dataForDb.state,
      country: dataForDb.country, postalCode: dataForDb.postalCode, coordinates: wktCoordinates,
    });
    await newLocation.save();

    // Create SellerProperty Document
    const lastSellerProperty = await SellerProperty.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextSellerPropertyId = (lastSellerProperty?.id ?? 0) + 1;

    const sellerPropertyToSave = new SellerProperty({
      ...dataForDb,
      id: nextSellerPropertyId,
      locationId: newLocation.id,
      photoUrls: uploadedPhotoUrls,
      agreementDocumentUrl: agreementDocumentUrl,
      // Mongoose schema defaults will handle `postedDate`, `buyerInquiries`
    });

    const savedSellerProperty = await sellerPropertyToSave.save();

    // Prepare Response
    const propertyDocObject = savedSellerProperty.toObject({ virtuals: true }) as SavedSellerPropertyDocument;
    const { _id: propMongoId, locationId: propLocId, photoUrls: respPhotoUrls, agreementDocumentUrl: respAgreementUrl, ...restOfSavedProp } = propertyDocObject;

    const responseData: CreatedSellerPropertyResponse = {
      ...restOfSavedProp,
      _id: propMongoId.toString(),
      photoUrls: respPhotoUrls, // Include in response if frontend needs them immediately
      agreementDocumentUrl: respAgreementUrl,
      location: {
        id: newLocation.id, address: newLocation.address!, city: newLocation.city!,
        state: newLocation.state!, country: newLocation.country!, postalCode: newLocation.postalCode!,
        coordinates: { longitude, latitude },
      },
    };

    return NextResponse.json(responseData, { status: 201 });

  } catch (error: unknown) {
    console.error('POST /api/seller-properties - Error:', error);
    if (isMongooseValidationError(error)) {
      return NextResponse.json({ message: 'Validation Error from Database', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred during property creation.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET() {
  await dbConnect();
  try {
    // Fetch all seller properties
    const properties = await SellerProperty.find().lean();

    // Get all referenced locations by their IDs
    const locationIds = properties.map(p => p.locationId);
    const locations = await Location.find({ id: { $in: locationIds } }).lean();

    // Format each property with corresponding location
    const response: CreatedSellerPropertyResponse[] = properties.map(property => {
      const location = locations.find(loc => loc.id === property.locationId);

      const formattedLocation: FormattedLocationForResponse = {
        id: location?.id ?? -1,
        address: location?.address ?? '',
        city: location?.city ?? '',
        state: location?.state ?? '',
        country: location?.country ?? '',
        postalCode: location?.postalCode ?? '',
        coordinates: location?.coordinates
          ? {
              longitude: parseFloat(location.coordinates.split('(')[1]?.split(' ')[0] ?? '0'),
              latitude: parseFloat(location.coordinates.split(' ')[1]?.replace(')', '') ?? '0'),
            }
          : null,
      };

      return {
        ...property,
        _id: property._id.toString(),
        location: formattedLocation,
      };
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching seller properties:", error);
    return NextResponse.json({ message: "Failed to fetch seller properties." }, { status: 500 });
  }
}
