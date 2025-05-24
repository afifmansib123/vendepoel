// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Property from '@/lib/models/Property'; // Your Mongoose Property model (adjusted version)
import Location from '@/lib/models/Location'; // Your Mongoose Location model (adjusted version)
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios from 'axios';

// --- Helper Functions ---
const toNumber = (val: string | undefined | null): number | undefined => {
  if (val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

const parseWKTPoint = (wktString: string | null | undefined): { longitude: number; latitude: number } | null => {
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
    const value = formData.get(key) as string | null;
    if (value === null || value === '') return undefined; // Treat empty string as undefined for numbers
    const num = isFloat ? parseFloat(value) : parseInt(value, 10);
    return isNaN(num) ? undefined : num;
};

const getBooleanFormValue = (formData: FormData, key: string): boolean => {
    const value = formData.get(key) as string | null;
    return value === 'true';
};

// --- S3 Configuration (ensure environment variables are set) ---
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
    // const latitude = toNumber(searchParams.get('latitude')); // Geospatial difficult with WKT
    // const longitude = toNumber(searchParams.get('longitude')); // Geospatial difficult with WKT

    const propertyFilters: any = {};

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
        const baths = Number(bathsStr);
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
    const propertiesFromDB = await Property.find(propertyFilters).lean().exec();
    console.log(`Found ${propertiesFromDB.length} properties matching filters.`);

    const populatedProperties = await Promise.all(
      propertiesFromDB.map(async (prop: any) => {
        let locationData = null;
        if (prop.locationId) {
          const locationDoc = await Location.findOne({ id: prop.locationId }).lean().exec();
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
        return { ...prop, location: locationData };
      })
    );

    return NextResponse.json(populatedProperties, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/properties - Error:', error);
    return NextResponse.json({ message: `Error retrieving properties: ${error.message}` }, { status: 500 });
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
        const uploadPromises = files.map(async (file) => {
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
                const result = await upload.done();
                return result.Location;
            } catch (s3Error) {
                console.error("S3 individual file upload Error:", s3Error);
                return null; // Or throw to fail entire request
            }
        });
        const results = await Promise.all(uploadPromises);
        results.forEach(url => { if (url) validPhotoUrls.push(url); });
    }
    console.log("Uploaded photo URLs:", validPhotoUrls);

    let longitude = 0, latitude = 0;
    try {
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
            street: address, city, country, postalcode: postalCode, format: "json", limit: "1",
        }).toString()}`;
        console.log("Geocoding URL:", geocodingUrl);
        const geocodingResponse = await axios.get(geocodingUrl, {
            headers: { 'User-Agent': 'RealEstateApp/1.0 (dev@example.com)' }, // Replace with your app info
        });
        if (geocodingResponse.data && geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat) {
            longitude = parseFloat(geocodingResponse.data[0].lon);
            latitude = parseFloat(geocodingResponse.data[0].lat);
            console.log(`Geocoded to: Lon ${longitude}, Lat ${latitude}`);
        } else {
            console.warn("Geocoding failed or no results for:", address, city);
        }
    } catch (geoError: any) {
        console.error("Geocoding API error:", geoError.message);
    }
    const wktCoordinates = `POINT(${longitude} ${latitude})`;

    const lastLocation = await Location.findOne().sort({ id: -1 }).select('id').lean();
    const nextLocationId = (lastLocation && typeof lastLocation.id === 'number' ? lastLocation.id : 0) + 1;
    const newLocationData = {
        id: nextLocationId, address, city, state, country, postalCode,
        coordinates: wktCoordinates,
    };
    const newLocation = new Location(newLocationData);
    await newLocation.save();
    console.log("New Location saved with ID:", newLocation.id);

    const propertyDataFromForm = {
        name: formData.get('name') as string | undefined,
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

    // Validate required property fields
    if (!propertyDataFromForm.name || !propertyDataFromForm.pricePerMonth || !propertyDataFromForm.beds || !propertyDataFromForm.baths || !propertyDataFromForm.squareFeet || !propertyDataFromForm.propertyType) {
        return NextResponse.json({ message: 'Missing required property data fields.' }, { status: 400 });
    }

    const lastProperty = await Property.findOne().sort({ id: -1 }).select('id').lean();
    const nextPropertyId = (lastProperty && typeof lastProperty.id === 'number' ? lastProperty.id : 0) + 1;

    const newPropertyDoc = new Property({
      id: nextPropertyId,
      ...propertyDataFromForm,
      photoUrls: validPhotoUrls,
      locationId: newLocation.id,
      managerCognitoId: managerCognitoId,
    });
    await newPropertyDoc.save();
    console.log("New Property saved with ID:", newPropertyDoc.id);

    const propertyToReturn = {
        ...newPropertyDoc.toObject(),
        location: {
            id: newLocation.id, address, city, state, country, postalCode,
            coordinates: { longitude, latitude } // Return parsed coords for consistency
        },
    };

    return NextResponse.json(propertyToReturn, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/properties - Error:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error creating property: ${error.message}` }, { status: 500 });
  }
}