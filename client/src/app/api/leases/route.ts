// src/app/api/leases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lease from '@/lib/models/Lease';     // Your Mongoose Lease model
import Tenant from '@/lib/models/Tenant';   // To populate tenant
import Property from '@/lib/models/Property'; // To populate property
// Location model is dynamically imported below

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
  locationId?: number; // Numeric ID referencing Location
  // Add other property fields as they exist in your schema
  [key: string]: any;
}

interface TenantDocumentLean {
  _id: Types.ObjectId | string;
  cognitoId: string; // Assuming cognitoId is always present
  // Add other tenant fields
  [key: string]: any;
}

interface LeaseDocumentLean {
  _id: Types.ObjectId | string;
  id?: number; // Assuming leases might also have a custom numeric ID
  tenant?: Types.ObjectId | string; // ObjectId ref to Tenant model
  tenantCognitoId?: string;        // Alternatively, cognitoId of the tenant
  propertyId?: number;             // Numeric ID of the property
  startDate?: Date | string;
  endDate?: Date | string;
  rent?: number;
  // Add other lease fields
  [key: string]: any;
}

// --- Interfaces for Formatted Data in API Response ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string; // Ensure string for response
  coordinates: ParsedPointCoordinates | null;
}

interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; // Ensure string for response
  location: FormattedLocationResponse | null;
  // Add other formatted property fields if needed
}

interface FormattedTenantResponse extends Omit<TenantDocumentLean, '_id'> {
    _id: string; // Ensure string for response
}

interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'tenant' | 'propertyId' | '_id' | 'startDate' | 'endDate'> {
  _id: string; // Ensure string for response
  startDate?: string; // Dates as ISO strings
  endDate?: string;
  tenant: FormattedTenantResponse | null;
  property: FormattedPropertyResponse | null;
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

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const rawLeases = await Lease.find({})
        .lean()
        .exec() as unknown as LeaseDocumentLean[]; // Assert type for raw leases

    const leases: FormattedLeaseResponse[] = await Promise.all(
        rawLeases.map(async (lease: LeaseDocumentLean): Promise<FormattedLeaseResponse> => {
            let tenantData: FormattedTenantResponse | null = null;
            let propertyData: FormattedPropertyResponse | null = null;

            // Destructure lease to handle _id and dates for final response
            const { _id: lease_Id, startDate: leaseStartDate, endDate: leaseEndDate, ...restOfLease } = lease;


            // Populate Tenant:
            if (lease.tenant) { // If Lease.tenant stores Tenant ObjectId
                const tenantDoc = await Tenant.findById(lease.tenant)
                    .lean()
                    .exec() as unknown as TenantDocumentLean | null;
                if (tenantDoc) {
                    const { _id: tenant_Id, ...restOfTenantDoc } = tenantDoc;
                    tenantData = {
                        ...restOfTenantDoc,
                        _id: typeof tenant_Id === 'string' ? tenant_Id : tenant_Id.toString(),
                        cognitoId: tenantDoc.cognitoId, // Ensure cognitoId is present
                    };
                }
            } else if (lease.tenantCognitoId) { // Or if it stores cognitoId
                const tenantDoc = await Tenant.findOne({ cognitoId: lease.tenantCognitoId })
                    .lean()
                    .exec() as unknown as TenantDocumentLean | null;
                if (tenantDoc) {
                    const { _id: tenant_Id, ...restOfTenantDoc } = tenantDoc;
                    tenantData = {
                        ...restOfTenantDoc,
                        _id: typeof tenant_Id === 'string' ? tenant_Id : tenant_Id.toString(),
                        cognitoId: tenantDoc.cognitoId,
                    };
                }
            }


            // Populate Property:
            if (lease.propertyId !== undefined && lease.propertyId !== null) {
                const prop = await Property.findOne({ id: lease.propertyId })
                    .lean()
                    .exec() as unknown as PropertyDocumentLean | null;
                if (prop) {
                    let locationData: FormattedLocationResponse | null = null;
                    const { _id: prop_Id, locationId: propLocationId, ...restOfProp } = prop;

                    if (propLocationId !== undefined && propLocationId !== null) {
                        // Dynamically import Location model
                        const LocationModel = await dbConnect().then(() => import('@/lib/models/Location')).then(mod => mod.default);
                        const loc = await LocationModel.findOne({ id: propLocationId })
                            .lean()
                            .exec() as unknown as LocationDocumentLean | null;

                        if (loc) {
                            const { _id: loc_Id, coordinates: locCoords, ...restOfLoc } = loc;
                            locationData = {
                                ...restOfLoc,
                                _id: typeof loc_Id === 'string' ? loc_Id : loc_Id.toString(),
                                id: loc.id, // Ensure numeric id is carried over
                                coordinates: parseWKTPoint(locCoords)
                            };
                        }
                    }
                    propertyData = {
                        ...restOfProp,
                        _id: typeof prop_Id === 'string' ? prop_Id : prop_Id.toString(),
                        id: prop.id, // Ensure numeric id is carried over
                        location: locationData
                    };
                }
            }
            return {
                ...restOfLease,
                _id: typeof lease_Id === 'string' ? lease_Id : lease_Id.toString(),
                id: lease.id, // Ensure numeric id is carried over if present
                startDate: leaseStartDate ? new Date(leaseStartDate).toISOString() : undefined,
                endDate: leaseEndDate ? new Date(leaseEndDate).toISOString() : undefined,
                tenant: tenantData,
                property: propertyData
            };
        })
    );


    return NextResponse.json(leases, { status: 200 });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error('Error retrieving leases:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving leases: ${message}` }, { status: 500 });
  }
}