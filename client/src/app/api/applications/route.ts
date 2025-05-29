// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application';
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';
import Manager from '@/lib/models/Manager';
import Landlord from '@/lib/models/Landlord';
import Location from '@/lib/models/Location';
import Lease from '@/lib/models/Lease';
// import Buyer from '@/lib/models/Buyer'; // Uncomment if you have a Buyer model

// --- START Standard Type Definitions ---

interface ParsedPointCoordinates {
  longitude: number;
  latitude: number;
}

// --- Model-Specific Lean Document Interfaces (as fetched from DB) ---
interface LocationDocumentLean {
  _id: Types.ObjectId | string;
  id: number;
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
  id: number;
  managerCognitoId?: string; // Links to Landlord or Manager
  locationId?: number;
  pricePerMonth?: number;
  securityDeposit?: number;
  name?: string; // Assuming property has a name
  // Add other property fields
  [key: string]: any;
}

interface PropertyIdOnlyLean {
  id: number;
  _id: Types.ObjectId | string;
}

interface TenantDocumentLean {
  _id: Types.ObjectId | string;
  id?: number; // Custom numeric ID, if exists
  cognitoId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  // Exclude favorites, properties for this context if not needed for application list
  [key: string]: any;
}

// Placeholder for Buyer model, adjust if you have one
interface BuyerDocumentLean extends Omit<TenantDocumentLean, 'id'> {
  // Buyer-specific fields if any
}


interface ManagerDocumentLean {
  _id: Types.ObjectId | string;
  cognitoId: string;
  name?: string;
  email?: string;
  // id?: number; // If managers have a custom numeric ID
  [key: string]: any;
}

interface LandlordDocumentLean {
  _id: Types.ObjectId | string;
  cognitoId: string;
  name?: string;
  email?: string;
  // id?: number; // If landlords have a custom numeric ID
  [key: string]: any;
}

// Union type for owner (Manager or Landlord)
type OwnerDocumentLean = ManagerDocumentLean | LandlordDocumentLean;


interface LeaseDocumentLean {
  _id: Types.ObjectId | string;
  id: number;
  startDate?: Date | string;
  endDate?: Date | string;
  rent?: number;
  deposit?: number;
  propertyId?: number;
  applicantCognitoId?: string; // Changed from tenantCognitoId
  applicantType?: 'tenant' | 'buyer'; // Added to specify applicant type
  [key: string]: any;
}

interface ApplicationDocumentLean {
  _id: Types.ObjectId | string;
  id: number;
  applicationDate?: Date | string;
  status: string;
  propertyId: number;
  applicantCognitoId: string; // Changed from tenantCognitoId
  applicantType: 'tenant' | 'buyer'; // Added
  name: string; // Applicant's name at the time of application
  email: string; // Applicant's email
  phoneNumber: string; // Applicant's phone
  message?: string;
  leaseId?: number;
  [key: string]: any;
}

// --- Interfaces for Formatted Data in API Responses (GET & POST) ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string;
  coordinates: ParsedPointCoordinates | null;
}

interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string;
  location: FormattedLocationResponse | null;
  address?: string;
}

// Combined type for applicant (Tenant or Buyer) data in response
interface FormattedApplicantResponse {
    _id: string;
    id?: number; // if applicable
    cognitoId: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    [key: string]: any;
}


// Combined type for owner (Manager or Landlord) data in response
interface FormattedOwnerResponse {
    _id: string;
    cognitoId: string;
    name?: string;
    email?: string;
    [key: string]: any;
}

interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'startDate' | 'endDate' | '_id' | 'applicantCognitoId' | 'applicantType'> {
  _id: string;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  nextPaymentDate: string | null;
  applicantCognitoId: string;
  applicantType: 'tenant' | 'buyer';
}

interface FormattedApplicationResponse extends Omit<ApplicationDocumentLean, 'applicationDate' | 'propertyId' | 'applicantCognitoId' | 'applicantType' | 'leaseId' | '_id'> {
  _id: string;
  applicationDate?: string; // ISO string
  property: FormattedPropertyResponse | null;
  applicant: FormattedApplicantResponse | null; // Changed from tenant
  applicantType: 'tenant' | 'buyer';
  owner: FormattedOwnerResponse | null; // Changed from manager
  lease: FormattedLeaseResponse | null;
}

// --- Interfaces for POST Request ---
interface ApplicationPostBody {
  status: string;
  propertyId: number;
  applicantCognitoId: string;
  applicantType: 'tenant' | 'buyer';
  name: string;
  email: string;
  phoneNumber: string;
  message?: string;
}

interface NewLeaseData {
    id: number;
    startDate: Date;
    endDate: Date;
    rent?: number;
    deposit?: number;
    propertyId: number;
    applicantCognitoId: string;
    applicantType: 'tenant' | 'buyer';
}
interface NewApplicationData {
    id: number;
    applicationDate: Date;
    status: string;
    propertyId: number;
    applicantCognitoId: string;
    applicantType: 'tenant' | 'buyer';
    name: string;
    email: string;
    phoneNumber: string;
    message?: string;
    leaseId: number; // Link to the created lease
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
  property: (Omit<FormattedPropertyResponse, 'location'> & { location: null }) | null; // Simplified for POST
  applicant: FormattedApplicantResponse | null;
  applicantType: 'tenant' | 'buyer';
  lease: (Omit<FormattedLeaseResponse, 'nextPaymentDate'>) | null; // Simplified for POST
}


// --- Utility Types ---
interface MongoQueryFilter {
  tenantCognitoId?: string; // Kept for backward compatibility or direct tenant lease lookup
  applicantCognitoId?: string; // For new lease/application structure
  propertyId?: { $in: number[] } | number;
  id?: number; // For specific ID lookups (e.g. leaseId)
  [key: string]: any;
}

interface MongooseValidationError {
  name: 'ValidationError';
  message: string;
  errors: { [key: string]: { message: string; [key: string]: any } };
}
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}

// --- END Standard Type Definitions ---

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

function calculateNextPaymentDate(startDateInput: string | Date | undefined): Date | null {
    if (!startDateInput) return null;
    const startDate = typeof startDateInput === 'string' ? new Date(startDateInput) : startDateInput;
    if (isNaN(startDate.getTime())) return null;

    const today = new Date(); today.setHours(0,0,0,0);
    const nextPaymentDate = new Date(startDate); nextPaymentDate.setHours(0,0,0,0);

    if (nextPaymentDate > today) return nextPaymentDate;
    while (nextPaymentDate <= today) { nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1); }
    return nextPaymentDate;
}

// --- GET Handler (List Applications) ---
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // User's cognitoId (tenant, landlord, manager)
    const userType = searchParams.get('userType') as 'tenant' | 'landlord' | 'manager' | null;

    let mongoWhereClause: MongoQueryFilter = {};

    if (userId && userType) {
      if (userType === 'tenant') {
        // If a tenant is viewing their applications
        mongoWhereClause.applicantCognitoId = userId;
        mongoWhereClause.applicantType = 'tenant'; // Assuming tenants apply as tenants
      } else if (userType === 'manager' || userType === 'landlord') {
        // If a manager or landlord is viewing applications for their properties
        const propertiesOfOwner = await Property.find({ managerCognitoId: userId })
          .select('id')
          .lean()
          .exec() as unknown as PropertyIdOnlyLean[];
        
        const propertyIdsOfOwner = propertiesOfOwner.map(p => p.id);
        if (propertyIdsOfOwner.length > 0) {
          mongoWhereClause.propertyId = { $in: propertyIdsOfOwner };
        } else {
          return NextResponse.json([] as FormattedApplicationResponse[], { status: 200 });
        }
      } else {
         console.warn(`Unexpected userType received in GET: ${userType}`);
         // Potentially return 400 or fetch all if that's the desired fallback
      }
    }

    const applicationsFromDb = await Application.find(mongoWhereClause)
      .sort({ applicationDate: -1 }) // Sort by newest first
      .lean()
      .exec() as unknown as ApplicationDocumentLean[];

    const formattedApplications: FormattedApplicationResponse[] = await Promise.all(
      applicationsFromDb.map(async (app): Promise<FormattedApplicationResponse> => {
        let propertyData: FormattedPropertyResponse | null = null;
        let ownerData: FormattedOwnerResponse | null = null;
        let applicantData: FormattedApplicantResponse | null = null;
        let leaseDataWithNextPayment: FormattedLeaseResponse | null = null;

        const { _id: appId, applicationDate: appDate, propertyId: appPropertyId, applicantCognitoId: appApplicantCognitoId, applicantType: appApplicantType, leaseId: appLeaseId, ...restOfApp } = app;

        // Populate Property
        if (appPropertyId) {
          const propDoc = await Property.findOne({ id: appPropertyId }).lean().exec() as unknown as PropertyDocumentLean | null;
          if (propDoc) {
            let locationData: FormattedLocationResponse | null = null;
            const { _id: propMongoId, locationId: propLocationId, managerCognitoId: propManagerCognitoId, ...restOfPropDoc } = propDoc;
            if (propLocationId) {
              const locDoc = await Location.findOne({ id: propLocationId }).lean().exec() as unknown as LocationDocumentLean | null;
              if (locDoc) {
                const { _id: locMongoId, coordinates, ...restOfLocDoc } = locDoc;
                locationData = {
                  ...restOfLocDoc, _id: locMongoId.toString(), id: locDoc.id,
                  coordinates: parseWKTPoint(coordinates),
                };
              }
            }
            propertyData = {
              ...restOfPropDoc, _id: propMongoId.toString(), id: propDoc.id,
              location: locationData, address: locationData?.address, managerCognitoId: propManagerCognitoId
            };

            // Populate Owner (Landlord/Manager) of the Property
            if (propManagerCognitoId) {
                // Heuristic: if the top-level userType is landlord, assume owner is landlord.
                // This might need refinement if a manager can see applications for a landlord's property etc.
                let ownerUserDoc: OwnerDocumentLean | null = null;
                if (userType === 'landlord' || (propertyData as any)?.managerType === 'landlord') { // Assuming managerType might be on property
                    ownerUserDoc = await Landlord.findOne({ cognitoId: propManagerCognitoId })
                        .select('cognitoId name email _id') // Specify fields
                        .lean().exec() as unknown as LandlordDocumentLean | null;
                } else { // Default to Manager
                    ownerUserDoc = await Manager.findOne({ cognitoId: propManagerCognitoId })
                        .select('cognitoId name email _id') // Specify fields
                        .lean().exec() as unknown as ManagerDocumentLean | null;
                }
                if (ownerUserDoc) {
                    ownerData = {
                        _id: ownerUserDoc._id.toString(), cognitoId: ownerUserDoc.cognitoId,
                        name: ownerUserDoc.name, email: ownerUserDoc.email,
                    };
                }
            }
          }
        }

        // Populate Applicant (Tenant/Buyer)
        if (appApplicantCognitoId && appApplicantType) {
          let applicantUserDoc: TenantDocumentLean | BuyerDocumentLean | null = null;
          const selectFields = 'cognitoId name email phoneNumber _id id'; // Common fields
          if (appApplicantType === 'tenant') {
            applicantUserDoc = await Tenant.findOne({ cognitoId: appApplicantCognitoId }).select(selectFields).lean().exec() as unknown as TenantDocumentLean | null;
          }
          // else if (appApplicantType === 'buyer') {
          //   applicantUserDoc = await Buyer.findOne({ cognitoId: appApplicantCognitoId }).select(selectFields).lean().exec() as unknown as BuyerDocumentLean | null;
          // } // Uncomment if Buyer model exists
          if (applicantUserDoc) {
            applicantData = {
              _id: applicantUserDoc._id.toString(), cognitoId: applicantUserDoc.cognitoId,
              name: applicantUserDoc.name, email: applicantUserDoc.email, phoneNumber: applicantUserDoc.phoneNumber,
              id: applicantUserDoc.id, // If tenant/buyer has numeric id
            };
          }
        }

        // Populate Lease
        if (appLeaseId) {
          const leaseDoc = await Lease.findOne({ id: appLeaseId }).lean().exec() as unknown as LeaseDocumentLean | null;
          if (leaseDoc) {
            const { _id: leaseMongoId, startDate, endDate, applicantCognitoId: leaseAppCognitoId, applicantType: leaseAppType, ...restOfLeaseDoc } = leaseDoc;
            const nextPayment = calculateNextPaymentDate(startDate);
            leaseDataWithNextPayment = {
              ...restOfLeaseDoc, _id: leaseMongoId.toString(), id: leaseDoc.id,
              startDate: startDate ? new Date(startDate).toISOString() : undefined,
              endDate: endDate ? new Date(endDate).toISOString() : undefined,
              nextPaymentDate: nextPayment ? nextPayment.toISOString() : null,
              applicantCognitoId: leaseAppCognitoId!, // Assert non-null as per schema
              applicantType: leaseAppType!, // Assert non-null
            };
          }
        } else if (appApplicantCognitoId && appPropertyId && appApplicantType) {
            // Fallback to find lease if not directly linked by leaseId but by applicant and property
            const leaseDoc = await Lease.findOne({ applicantCognitoId: appApplicantCognitoId, propertyId: appPropertyId, applicantType: appApplicantType })
                .sort({ startDate: -1 }) // Get the latest if multiple
                .lean().exec() as unknown as LeaseDocumentLean | null;
            if (leaseDoc) {
                 const { _id: leaseMongoId, startDate, endDate, applicantCognitoId: leaseAppCognitoId, applicantType: leaseAppType, ...restOfLeaseDoc } = leaseDoc;
                 const nextPayment = calculateNextPaymentDate(startDate);
                 leaseDataWithNextPayment = {
                    ...restOfLeaseDoc, _id: leaseMongoId.toString(), id: leaseDoc.id,
                    startDate: startDate ? new Date(startDate).toISOString() : undefined,
                    endDate: endDate ? new Date(endDate).toISOString() : undefined,
                    nextPaymentDate: nextPayment ? nextPayment.toISOString() : null,
                    applicantCognitoId: leaseAppCognitoId!,
                    applicantType: leaseAppType!,
                 };
            }
        }

        return {
          ...restOfApp,
          _id: appId.toString(),
          id: app.id,
          applicationDate: appDate ? new Date(appDate).toISOString() : undefined,
          property: propertyData,
          applicant: applicantData,
          applicantType: appApplicantType,
          owner: ownerData,
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
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body: ApplicationPostBody = await request.json();
    const { status, propertyId, applicantCognitoId, applicantType, name, email, phoneNumber, message } = body;

    // Validate required fields
    if (!status || !propertyId || !applicantCognitoId || !applicantType || !name || !email || !phoneNumber) {
      return NextResponse.json({ message: 'Missing required fields for application' }, { status: 400 });
    }
    if (applicantType !== 'tenant' /* && applicantType !== 'buyer' */) { // Add buyer check if model exists
        return NextResponse.json({ message: 'Invalid applicant type provided.' }, { status: 400 });
    }

    // Fetch Property
    const property = await Property.findOne({ id: propertyId })
      .select('pricePerMonth securityDeposit id _id managerCognitoId name') // Fetch name for response
      .lean().exec() as unknown as PropertyDocumentLean | null;
    if (!property) return NextResponse.json({ message: 'Property not found' }, { status: 404 });

    // Fetch Applicant (Tenant or Buyer)
    let applicant: TenantDocumentLean | BuyerDocumentLean | null = null;
    const applicantSelectFields = 'id cognitoId _id name email phoneNumber';
    if (applicantType === 'tenant') {
        applicant = await Tenant.findOne({ cognitoId: applicantCognitoId })
            .select(applicantSelectFields).lean().exec() as unknown as TenantDocumentLean | null;
    }
    // else if (applicantType === 'buyer') {
    //     applicant = await Buyer.findOne({ cognitoId: applicantCognitoId })
    //         .select(applicantSelectFields).lean().exec() as unknown as BuyerDocumentLean | null;
    // } // Uncomment and ensure Buyer model exists and is imported
    if (!applicant) return NextResponse.json({ message: `${applicantType.charAt(0).toUpperCase() + applicantType.slice(1)} not found` }, { status: 404 });

    // Create Lease
    const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextLeaseId = (lastLease?.id ?? 0) + 1;
    const newLeaseData: NewLeaseData = {
        id: nextLeaseId, startDate: new Date(), endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: property.pricePerMonth, deposit: property.securityDeposit, propertyId: property.id,
        applicantCognitoId: applicant.cognitoId, applicantType: applicantType,
    };
    const newLease = new Lease(newLeaseData);
    const savedLease = await newLease.save(); // Mongoose document

    // Create Application
    const lastApplication = await Application.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextApplicationId = (lastApplication?.id ?? 0) + 1;
    const newApplicationData: NewApplicationData = {
      id: nextApplicationId, applicationDate: new Date(), status, propertyId: property.id,
      applicantCognitoId: applicant.cognitoId, applicantType: applicantType,
      name, email, phoneNumber, message, leaseId: savedLease.id,
    };
    const newApplication = new Application(newApplicationData);
    const savedApplication = await newApplication.save(); // Mongoose document

    // Prepare response
    const savedAppObject = savedApplication.toObject({ virtuals: true }) as ApplicationDocumentLean;
    const savedLeaseObject = savedLease.toObject({ virtuals: true }) as LeaseDocumentLean;

    const applicationToReturn: CreatedApplicationResponse = {
        _id: savedAppObject._id.toString(), id: savedAppObject.id,
        applicationDate: new Date(savedAppObject.applicationDate || Date.now()).toISOString(),
        status: savedAppObject.status, name: savedAppObject.name, email: savedAppObject.email,
        phoneNumber: savedAppObject.phoneNumber, message: savedAppObject.message,
        property: {
            _id: property._id.toString(), id: property.id, pricePerMonth: property.pricePerMonth,
            securityDeposit: property.securityDeposit, managerCognitoId: property.managerCognitoId,
            name: property.name,
            location: null, // Location not populated in POST response for brevity
        },
        applicant: {
            _id: applicant._id.toString(), id: applicant.id, cognitoId: applicant.cognitoId,
            name: applicant.name, email: applicant.email, phoneNumber: applicant.phoneNumber,
        },
        applicantType: applicantType,
        lease: {
            _id: savedLeaseObject._id.toString(), id: savedLeaseObject.id,
            startDate: new Date(savedLeaseObject.startDate || Date.now()).toISOString(),
            endDate: new Date(savedLeaseObject.endDate || Date.now()).toISOString(),
            rent: savedLeaseObject.rent, deposit: savedLeaseObject.deposit,
            propertyId: savedLeaseObject.propertyId!, // Non-null asserted
            applicantCognitoId: savedLeaseObject.applicantCognitoId!, // Non-null asserted
            applicantType: savedLeaseObject.applicantType!, // Non-null asserted
        },
    };
    return NextResponse.json(applicationToReturn, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating application:', error);
    if (isMongooseValidationError(error)) {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error creating application: ${msg}` }, { status: 500 });
  }
}