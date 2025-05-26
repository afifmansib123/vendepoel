// src/app/api/applications/[applicationId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application';
import Lease from '@/lib/models/Lease';
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';
import Manager from '@/lib/models/Manager';
import Location from '@/lib/models/Location';

// --- START Standard Type Definitions ---

// Route Handler Context
interface HandlerContext {
  params: {
    applicationId: string;
  };
}

// Request Body for PUT
interface UpdateStatusBody {
  status: string; // e.g., "Approved", "Denied"
}

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
  managerCognitoId?: string;
  locationId?: number;
  pricePerMonth?: number;
  securityDeposit?: number;
  tenants?: string[]; // Array of tenant cognitoIds
  [key: string]: any;
}

interface TenantDocumentLean {
  _id: Types.ObjectId | string;
  cognitoId: string;
  // Omitting fields like 'id', 'favorites', 'properties' as per original .select()
  [key: string]: any;
}

interface ManagerDocumentLean {
  _id: Types.ObjectId | string;
  cognitoId: string;
  // Omitting fields like 'id' as per original .select()
  [key: string]: any;
}

interface LeaseDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID
  startDate?: Date | string;
  endDate?: Date | string;
  rent?: number;
  deposit?: number;
  propertyId?: number;
  tenantCognitoId?: string;
  [key: string]: any;
}

interface ApplicationDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID
  status: string;
  propertyId: number;
  tenantCognitoId: string;
  leaseId?: number; // Can be undefined initially
  applicationDate?: Date | string;
  name?: string; // Assuming these are part of the Application schema
  email?: string;
  phoneNumber?: string;
  message?: string;
  [key: string]: any;
}

// Data for new Lease creation
interface NewLeaseData {
  id: number;
  startDate: Date;
  endDate: Date;
  rent?: number;
  deposit?: number;
  propertyId: number;
  tenantCognitoId: string;
}

// Payload for updating Application
interface ApplicationUpdatePayload {
  status: string;
  leaseId?: number;
}

// --- Interfaces for Formatted Data in API Response ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string;
  coordinates: ParsedPointCoordinates | null;
}

interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string;
  location: FormattedLocationResponse | null;
  address?: string; // Convenience field
}

interface FormattedTenantResponse extends Omit<TenantDocumentLean, '_id'> {
    _id: string;
}

interface FormattedManagerResponse extends Omit<ManagerDocumentLean, '_id'> {
    _id: string;
}

interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'startDate' | 'endDate' | '_id'> {
  _id: string;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  nextPaymentDate: string | null; // ISO string or null
}

interface FormattedApplicationResponse extends Omit<ApplicationDocumentLean, 'applicationDate' | '_id'> {
  _id: string; // Ensure string
  applicationDate?: string; // ISO string
  property: FormattedPropertyResponse | null;
  tenant: FormattedTenantResponse | null;
  manager: FormattedManagerResponse | null;
  lease: FormattedLeaseResponse | null;
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

// Helper for WKT parsing (already well-typed)
function parseWKTPoint(wktString: string | null | undefined): ParsedPointCoordinates | null {
    if (!wktString || typeof wktString !== 'string') return null;
    const match = wktString.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match && match.length === 3) {
        const longitude = parseFloat(match[1]);
        const latitude = parseFloat(match[2]);
        if (!isNaN(longitude) && !isNaN(latitude)) { return { longitude, latitude }; }
    }
    return null;
}

function calculateNextPaymentDate(startDateInput: string | Date): Date | null {
    if (!startDateInput) return null;
    const startDate = typeof startDateInput === 'string' ? new Date(startDateInput) : startDateInput;
    if (isNaN(startDate.getTime())) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const nextPaymentDate = new Date(startDate); nextPaymentDate.setHours(0,0,0,0);
    if (nextPaymentDate > today) { return nextPaymentDate; }
    while (nextPaymentDate <= today) { nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1); }
    return nextPaymentDate;
}

export async function PUT(
  request: NextRequest,
  context: HandlerContext // Use defined HandlerContext
) {
  await dbConnect();
  const { applicationId: appIdStr } = context.params;
  const numericAppId = Number(appIdStr);

  if (isNaN(numericAppId)) {
    return NextResponse.json({ message: 'Invalid Application ID format' }, { status: 400 });
  }

  try {
    const body: UpdateStatusBody = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ message: 'Status is required in body' }, { status: 400 });
    }

    const application = await Application.findOne({ id: numericAppId })
      .lean()
      .exec() as unknown as ApplicationDocumentLean | null;

    if (!application) {
      return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
    }

    // propertyId and tenantCognitoId are required on ApplicationDocumentLean based on usage
    if (typeof application.propertyId !== 'number' || typeof application.tenantCognitoId !== 'string') {
        // This should ideally not happen if application data is consistent
        console.error(`Application ${numericAppId} is missing propertyId or tenantCognitoId.`);
        return NextResponse.json({ message: 'Application data is incomplete.' }, { status: 500 });
    }

    const propertyForApp = await Property.findOne({ id: application.propertyId })
      .lean()
      .exec() as unknown as PropertyDocumentLean | null;

    if (!propertyForApp) {
      return NextResponse.json({ message: 'Associated property not found.' }, { status: 404 });
    }

    let updatedLeaseId: number | undefined = application.leaseId;

    if (status === 'Approved' && !application.leaseId) {
      const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
      const nextLeaseId = (lastLease && typeof lastLease.id === 'number' ? lastLease.id : 0) + 1;

      const newLeaseData: NewLeaseData = {
        id: nextLeaseId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: propertyForApp.pricePerMonth,
        deposit: propertyForApp.securityDeposit,
        propertyId: application.propertyId,
        tenantCognitoId: application.tenantCognitoId,
      };
      const newLease = new Lease(newLeaseData);
      const savedLease = await newLease.save(); // savedLease is a Mongoose document
      updatedLeaseId = savedLease.id; // Access numeric id

      await Property.updateOne(
        { id: application.propertyId },
        { $addToSet: { tenants: application.tenantCognitoId } }
      );
    }

    const updatePayload: ApplicationUpdatePayload = { status };
    if (updatedLeaseId !== undefined && updatedLeaseId !== application.leaseId) {
        updatePayload.leaseId = updatedLeaseId;
    }

    await Application.updateOne({ id: numericAppId }, { $set: updatePayload });

    const finalApplicationRaw = await Application.findOne({ id: numericAppId })
      .lean()
      .exec() as unknown as ApplicationDocumentLean | null;

    if (!finalApplicationRaw) {
      // Should not happen if update was successful, but good for robustness
      return NextResponse.json({ message: 'Failed to retrieve updated application.' }, { status: 500 });
    }

    // --- Populate response data (similar to GET /applications) ---
    let propertyDataResp: FormattedPropertyResponse | null = null;
    let managerDataResp: FormattedManagerResponse | null = null;
    let tenantDataResp: FormattedTenantResponse | null = null;
    let leaseDataResp: FormattedLeaseResponse | null = null;

    const { _id: finalApp_Id, applicationDate: finalAppDate, ...restOfFinalApp } = finalApplicationRaw;


    if (finalApplicationRaw.propertyId) {
        const prop = await Property.findOne({ id: finalApplicationRaw.propertyId })
            .lean()
            .exec() as unknown as PropertyDocumentLean | null;
        if (prop) {
            let locationData: FormattedLocationResponse | null = null;
            const { _id: prop_Id, locationId: propLocationId, ...restOfProp } = prop;
            if (propLocationId) {
                const loc = await Location.findOne({ id: propLocationId })
                    .lean()
                    .exec() as unknown as LocationDocumentLean | null;
                if (loc) {
                    const { _id: loc_Id, coordinates: locCoords, ...restOfLoc } = loc;
                    locationData = {
                        ...restOfLoc,
                        _id: typeof loc_Id === 'string' ? loc_Id : loc_Id.toString(),
                        id: loc.id,
                        coordinates: parseWKTPoint(locCoords),
                    };
                }
            }
            if (prop.managerCognitoId) {
                const manager = await Manager.findOne({ cognitoId: prop.managerCognitoId })
                    .select('-__v -createdAt -updatedAt -id')
                    .lean()
                    .exec() as unknown as Omit<ManagerDocumentLean, 'id'> | null;
                if (manager) {
                    const { _id: manager_Id, ...restOfManager } = manager;
                    managerDataResp = {
                        ...restOfManager,
                        _id: typeof manager_Id === 'string' ? manager_Id : manager_Id.toString(),
                        cognitoId: manager.cognitoId,
                    };
                }
            }
            propertyDataResp = {
                ...restOfProp,
                _id: typeof prop_Id === 'string' ? prop_Id : prop_Id.toString(),
                id: prop.id,
                location: locationData,
                address: locationData?.address,
            };
        }
    }

    if (finalApplicationRaw.tenantCognitoId) {
        const tenant = await Tenant.findOne({ cognitoId: finalApplicationRaw.tenantCognitoId })
            .select('-__v -createdAt -updatedAt -id -favorites -properties')
            .lean()
            .exec() as unknown as Omit<TenantDocumentLean, 'id' | 'favorites' | 'properties'> | null;
        if (tenant) {
            const { _id: tenant_Id, ...restOfTenant } = tenant;
            tenantDataResp = {
                ...restOfTenant,
                _id: typeof tenant_Id === 'string' ? tenant_Id : tenant_Id.toString(),
                cognitoId: tenant.cognitoId,
            };
        }
    }

    if (finalApplicationRaw.leaseId) {
        const lease = await Lease.findOne({ id: finalApplicationRaw.leaseId })
            .lean()
            .exec() as unknown as LeaseDocumentLean | null;
        if (lease) {
            const { _id: lease_Id, startDate: leaseStartDate, endDate: leaseEndDate, ...restOfLease } = lease;
            const nextPayment = calculateNextPaymentDate(leaseStartDate as string | Date);
            leaseDataResp = {
                ...restOfLease,
                _id: typeof lease_Id === 'string' ? lease_Id : lease_Id.toString(),
                id: lease.id,
                startDate: leaseStartDate ? new Date(leaseStartDate).toISOString() : undefined,
                endDate: leaseEndDate ? new Date(leaseEndDate).toISOString() : undefined,
                nextPaymentDate: nextPayment ? nextPayment.toISOString() : null,
            };
        }
    }

    const responsePayload: FormattedApplicationResponse = {
        ...restOfFinalApp,
        _id: typeof finalApp_Id === 'string' ? finalApp_Id : finalApp_Id.toString(),
        id: finalApplicationRaw.id,
        applicationDate: finalAppDate ? new Date(finalAppDate).toISOString() : undefined,
        property: propertyDataResp,
        tenant: tenantDataResp,
        manager: managerDataResp,
        lease: leaseDataResp,
    };

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error updating application ${numericAppId} status:`, error);
    if (isMongooseValidationError(error)) {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error updating application status: ${message}` }, { status: 500 });
  }
}