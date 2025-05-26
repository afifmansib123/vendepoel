// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application';
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';
import Manager from '@/lib/models/Manager';
import Location from '@/lib/models/Location';
import Lease from '@/lib/models/Lease';

// --- START Standard Type Definitions ---

// General utility types
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
  locationId?: number; // Numeric ID referencing Location
  pricePerMonth?: number;
  securityDeposit?: number;
  // Add other property fields
  [key: string]: any;
}

interface PropertyIdOnlyLean { // For the manager's property ID lookup
    id: number;
    _id: Types.ObjectId | string; // Mongoose _id is always there
}

interface TenantDocumentLean {
  _id: Types.ObjectId | string;
  id?: number; // If Tenant has a custom numeric id (original code selects 'id')
  cognitoId: string;
  // Add other tenant fields
  [key: string]: any;
}

interface ManagerDocumentLean {
  _id: Types.ObjectId | string;
  cognitoId: string;
  name?: string;
  email?: string;
  // Add other manager fields
  [key: string]: any;
}

interface LeaseDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID
  startDate?: Date | string; // Can be string from DB, needs conversion to Date
  endDate?: Date | string;
  rent?: number;
  deposit?: number;
  propertyId?: number;
  tenantCognitoId?: string;
  // Add other lease fields
  [key: string]: any;
}

interface ApplicationDocumentLean {
  _id: Types.ObjectId | string;
  id: number; // Custom numeric ID
  applicationDate?: Date | string;
  status: string;
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message?: string;
  leaseId?: number; // Numeric ID linking to a Lease
  [key: string]: any;
}

// --- Interfaces for Formatted Data in API Responses (GET) ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string; // Ensure string for response
  coordinates: ParsedPointCoordinates | null;
}

interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; // Ensure string for response
  location: FormattedLocationResponse | null;
  address?: string; // Convenience field
}

interface FormattedTenantResponse extends Omit<TenantDocumentLean, '_id'> {
  _id: string; // Ensure string for response
}

interface FormattedManagerResponse extends Omit<ManagerDocumentLean, '_id'> {
    _id: string; // Ensure string for response
}

interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'startDate' | 'endDate' | '_id'> {
  _id: string; // Ensure string for response
  startDate?: string; // Dates as ISO strings
  endDate?: string;
  nextPaymentDate: string | null; // ISO string or null
}

interface FormattedApplicationResponse extends Omit<ApplicationDocumentLean, 'applicationDate' | 'propertyId' | 'tenantCognitoId' | 'leaseId' | '_id'> {
  _id: string; // Ensure string for response
  applicationDate?: string; // Date as ISO string
  property: FormattedPropertyResponse | null;
  tenant: FormattedTenantResponse | null;
  manager: FormattedManagerResponse | null;
  lease: FormattedLeaseResponse | null;
}

// --- Interfaces for POST Request and Response ---
interface ApplicationPostBody {
  status: string;
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message?: string;
  // applicationDate is not expected in body, Mongoose schema has default
}

// For the Mongoose new Application() and new Lease() instantiation
// These reflect the schema fields before saving
interface NewLeaseData {
    id: number;
    startDate: Date;
    endDate: Date;
    rent?: number;
    deposit?: number;
    propertyId: number;
    tenantCognitoId: string;
}
interface NewApplicationData {
    id: number;
    applicationDate: Date;
    status: string;
    propertyId: number;
    tenantCognitoId: string;
    name: string;
    email: string;
    phoneNumber: string;
    message?: string;
    leaseId: number;
}

// For the response of POST after creating application and lease
interface CreatedApplicationResponse {
  _id: string;
  id: number;
  applicationDate: string; // ISO string
  status: string;
  name: string;
  email: string;
  phoneNumber: string;
  message?: string;
  // Simplified property, tenant, lease for POST response
  property: {
    _id: string;
    id: number;
    pricePerMonth?: number;
    securityDeposit?: number;
    location: null; // Placeholder as per original, or could be populated
    [key: string]: any;
  } | null;
  tenant: {
    _id: string;
    id?: number;
    cognitoId: string;
    [key: string]: any;
  } | null;
  lease: {
    _id: string;
    id: number;
    startDate: string; // ISO string
    endDate: string; // ISO string
    rent?: number;
    deposit?: number;
    propertyId: number;
    tenantCognitoId: string;
    [key: string]: any;
  } | null;
}

// For Mongoose .find() queries
interface MongoQueryFilter {
  tenantCognitoId?: string;
  propertyId?: { $in: number[] } | number; // For manager or direct propertyId
  [key: string]: any; // Allow other query parameters if needed
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

    const today = new Date();
    today.setHours(0,0,0,0);

    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setHours(0,0,0,0);

    if (nextPaymentDate > today) {
        return nextPaymentDate;
    }

    while (nextPaymentDate <= today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }
    return nextPaymentDate;
}

// --- GET Handler (List Applications) ---
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    let mongoWhereClause: MongoQueryFilter = {};

    if (userId && userType) {
      if (userType === 'tenant') {
        mongoWhereClause.tenantCognitoId = userId;
      } else if (userType === 'manager') {
        const managerProperties = await Property.find({ managerCognitoId: userId })
          .select('id')
          .lean()
          .exec() as unknown as PropertyIdOnlyLean[];
        const managerPropertyIds = managerProperties.map(p => p.id);
        if (managerPropertyIds.length > 0) {
          mongoWhereClause.propertyId = { $in: managerPropertyIds };
        } else {
          return NextResponse.json([] as FormattedApplicationResponse[], { status: 200 });
        }
      }
    }

    const applicationsFromDb = await Application.find(mongoWhereClause)
      .lean()
      .exec() as unknown as ApplicationDocumentLean[];

    const formattedApplications: FormattedApplicationResponse[] = await Promise.all(
      applicationsFromDb.map(async (app: ApplicationDocumentLean): Promise<FormattedApplicationResponse> => {
        let propertyData: FormattedPropertyResponse | null = null;
        let managerData: FormattedManagerResponse | null = null;
        let tenantData: FormattedTenantResponse | null = null;
        let leaseDataWithNextPayment: FormattedLeaseResponse | null = null;

        const { _id: appId, applicationDate: appDate, ...restOfApp } = app;

        if (app.propertyId) {
          const prop = await Property.findOne({ id: app.propertyId })
            .lean()
            .exec() as unknown as PropertyDocumentLean | null;
          if (prop) {
            let locationData: FormattedLocationResponse | null = null;
            const { _id: propId, locationId, ...restOfProp } = prop;
            if (locationId) {
              const loc = await Location.findOne({ id: locationId })
                .lean()
                .exec() as unknown as LocationDocumentLean | null;
              if (loc) {
                const { _id: locId, coordinates, ...restOfLoc } = loc;
                locationData = {
                  ...restOfLoc,
                  _id: typeof locId === 'string' ? locId : locId.toString(),
                  id: loc.id, // Make sure id is explicitly carried over
                  coordinates: parseWKTPoint(coordinates),
                };
              }
            }
            if (prop.managerCognitoId){
                const manager = await Manager.findOne({ cognitoId: prop.managerCognitoId })
                  .select('-__v -createdAt -updatedAt -id') // -id if manager doesn't have numeric id
                  .lean()
                  .exec() as unknown as Omit<ManagerDocumentLean, 'id'> | null; // Omit 'id' if not present
                if (manager) {
                    const { _id: managerId, ...restOfManager } = manager;
                    managerData = {
                        ...restOfManager,
                         _id: typeof managerId === 'string' ? managerId : managerId.toString(),
                         cognitoId: manager.cognitoId, // Ensure cognitoId is present
                    };
                }
            }
            propertyData = {
              ...restOfProp,
              _id: typeof propId === 'string' ? propId : propId.toString(),
              id: prop.id, // Make sure id is explicitly carried over
              location: locationData,
              address: locationData?.address,
            };
          }
        }

        if (app.tenantCognitoId) {
          const tenant = await Tenant.findOne({ cognitoId: app.tenantCognitoId })
            .select('-__v -createdAt -updatedAt -id -favorites -properties') // -id if tenant doesn't have numeric id
            .lean()
            .exec() as unknown as Omit<TenantDocumentLean, 'id' | 'favorites' | 'properties'> | null;
          if (tenant) {
            const { _id: tenantId, ...restOfTenant } = tenant;
            tenantData = {
              ...restOfTenant,
              _id: typeof tenantId === 'string' ? tenantId : tenantId.toString(),
              cognitoId: tenant.cognitoId, // Ensure cognitoId is present
            };
          }
        }

        const findLease = async (filter: MongoQueryFilter) => {
            const lease = await Lease.findOne(filter)
                .sort({ startDate: -1 }) // For fallback
                .lean()
                .exec() as unknown as LeaseDocumentLean | null;
            if (lease) {
                const { _id: leaseIdDb, startDate, endDate, ...restOfLease } = lease;
                const nextPayment = calculateNextPaymentDate(lease.startDate as string | Date); // Cast to expected type
                return {
                    ...restOfLease,
                    _id: typeof leaseIdDb === 'string' ? leaseIdDb : leaseIdDb.toString(),
                    id: lease.id, // Make sure id is explicitly carried over
                    startDate: startDate ? new Date(startDate).toISOString() : undefined,
                    endDate: endDate ? new Date(endDate).toISOString() : undefined,
                    nextPaymentDate: nextPayment ? nextPayment.toISOString() : null,
                } as FormattedLeaseResponse;
            }
            return null;
        };

        if (app.leaseId) {
            leaseDataWithNextPayment = await findLease({ id: app.leaseId });
        } else if (app.tenantCognitoId && app.propertyId) {
            leaseDataWithNextPayment = await findLease({
                tenantCognitoId: app.tenantCognitoId,
                propertyId: app.propertyId
            });
        }

        return {
          ...restOfApp,
          _id: typeof appId === 'string' ? appId : appId.toString(),
          id: app.id, // Make sure id is explicitly carried over
          applicationDate: appDate ? new Date(appDate).toISOString() : undefined,
          property: propertyData,
          tenant: tenantData,
          manager: managerData,
          lease: leaseDataWithNextPayment,
        };
      })
    );

    return NextResponse.json(formattedApplications, { status: 200 });
  } catch (error: unknown) {
    console.error('Error retrieving applications:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving applications: ${message}` }, { status: 500 });
  }
}

// --- POST Handler (Create Application) ---

// src/app/api/applications/route.ts
// ... (all other code and interfaces remain the same as my previous response) ...

// --- POST Handler (Create Application) ---
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body: ApplicationPostBody = await request.json();
    const {
      status, propertyId, tenantCognitoId, name, email, phoneNumber, message,
    } = body;

    if (!propertyId || !tenantCognitoId || !name || !email || !phoneNumber || !status) {
      return NextResponse.json({ message: 'Missing required fields for application' }, { status: 400 });
    }

    const property = await Property.findOne({ id: propertyId })
      .select('pricePerMonth securityDeposit id _id')
      .lean()
      .exec() as unknown as (Pick<PropertyDocumentLean, 'pricePerMonth' | 'securityDeposit' | 'id' | '_id'>) | null;
    if (!property) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    const tenant = await Tenant.findOne({ cognitoId: tenantCognitoId })
      .select('id cognitoId _id')
      .lean()
      .exec() as unknown as (Pick<TenantDocumentLean, 'id' | 'cognitoId' | '_id'>) | null;
    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextLeaseId = (lastLease && typeof lastLease.id === 'number' ? lastLease.id : 0) + 1;

    const newLeaseData: NewLeaseData = {
        id: nextLeaseId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: property.pricePerMonth,
        deposit: property.securityDeposit,
        propertyId: property.id,
        tenantCognitoId: tenant.cognitoId,
    };
    const newLease = new Lease(newLeaseData);
    const savedLease = await newLease.save();

    const lastApplication = await Application.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextApplicationId = (lastApplication && typeof lastApplication.id === 'number' ? lastApplication.id : 0) + 1;

    const newApplicationData: NewApplicationData = {
      id: nextApplicationId,
      applicationDate: new Date(),
      status,
      propertyId: property.id,
      tenantCognitoId: tenant.cognitoId,
      name, email, phoneNumber, message,
      leaseId: savedLease.id,
    };
    const newApplication = new Application(newApplicationData);
    const savedApplication = await newApplication.save();

    const savedAppObject = savedApplication.toObject({ virtuals: true }) as ApplicationDocumentLean;
    const savedLeaseObject = savedLease.toObject({ virtuals: true }) as LeaseDocumentLean;

    const applicationToReturn: CreatedApplicationResponse = {
        _id: typeof savedAppObject._id === 'string' ? savedAppObject._id : savedAppObject._id.toString(),
        id: savedAppObject.id,
        applicationDate: new Date(savedAppObject.applicationDate || Date.now()).toISOString(),
        status: savedAppObject.status,
        name: savedAppObject.name,
        email: savedAppObject.email,
        phoneNumber: savedAppObject.phoneNumber,
        message: savedAppObject.message,
        property: property ? {
            ...property,
            _id: typeof property._id === 'string' ? property._id : property._id.toString(),
            location: null,
        } : null,
        tenant: tenant ? {
            ...tenant,
             _id: typeof tenant._id === 'string' ? tenant._id : tenant._id.toString(),
             id: tenant.id,
        } : null,
        lease: savedLeaseObject ? { // This is where the fix is applied
            ...savedLeaseObject, // Spread first to get all common properties
            _id: typeof savedLeaseObject._id === 'string' ? savedLeaseObject._id : savedLeaseObject._id.toString(),
            id: savedLeaseObject.id, // Ensure custom numeric id is present
            startDate: savedLeaseObject.startDate ? new Date(savedLeaseObject.startDate).toISOString() : '',
            endDate: savedLeaseObject.endDate ? new Date(savedLeaseObject.endDate).toISOString() : '',
            // Explicitly set properties that CreatedApplicationResponse.lease requires as non-optional
            // This overrides the potentially optional versions from the ...savedLeaseObject spread if LeaseDocumentLean allows them to be optional.
            propertyId: savedLeaseObject.propertyId!, // Use non-null assertion
            tenantCognitoId: savedLeaseObject.tenantCognitoId!, // Use non-null assertion
            // rent and deposit remain optional as per CreatedApplicationResponse.lease and LeaseDocumentLean
        } : null,
    };

    return NextResponse.json(applicationToReturn, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating application:', error);
    if (isMongooseValidationError(error)) {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error creating application: ${message}` }, { status: 500 });
  }
}

// Make sure your interface definitions from the previous answer are included above this handler.
// Especially:
// interface LeaseDocumentLean { ... propertyId?: number; tenantCognitoId?: string; ...}
// interface CreatedApplicationResponse { ... lease: { ... propertyId: number; tenantCognitoId: string; ... } | null; ...}
// interface NewLeaseData { ... propertyId: number; tenantCognitoId: string; ...}