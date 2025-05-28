// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application'; // Assumed to use applicantCognitoId & applicantType
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';         // Still needed for lookup if applicantType is 'tenant'
import Buyer from '@/lib/models/Buyer';           // For lookup if applicantType is 'buyer'
import Manager from '@/lib/models/Manager';
import Location from '@/lib/models/Location';
import Lease from '@/lib/models/Lease';           // Assumed to use applicantCognitoId & applicantType
import Landlord from '@/lib/models/Landlord';     // Assuming you have a Landlord model

// --- START Unified Type Definitions for Applicants ---

interface ParsedPointCoordinates {
  longitude: number;
  latitude: number;
}

interface LocationDocumentLean {
  _id: Types.ObjectId | string; id: number; address?: string; city?: string; state?: string;
  country?: string; postalCode?: string; coordinates?: string; [key: string]: any;
}

interface PropertyDocumentLean {
  _id: Types.ObjectId | string; id: number; managerCognitoId?: string; landlordCognitoId?: string;
  locationId?: number; pricePerMonth?: number; securityDeposit?: number;
  // If you track applicants (tenants/buyers) associated with a property directly:
  // occupants?: { cognitoId: string, type: 'tenant' | 'buyer' }[];
  [key: string]: any;
}

interface PropertyIdOnlyLean { id: number; _id: Types.ObjectId | string; }

// Generic Applicant Document (Tenant or Buyer)
interface ApplicantDocumentLean {
  _id: Types.ObjectId | string; id?: number; cognitoId: string; name?: string; email?: string; phoneNumber?: string;
  [key: string]: any;
}

interface ManagerDocumentLean {
  _id: Types.ObjectId | string; cognitoId: string; name?: string; email?: string; [key: string]: any;
}
interface LandlordDocumentLean { // Assuming a Landlord model
    _id: Types.ObjectId | string; cognitoId: string; name?: string; email?: string; [key: string]: any;
}


// LeaseDocumentLean uses generic applicant
interface LeaseDocumentLean {
  _id: Types.ObjectId | string; id: number; startDate?: Date | string; endDate?: Date | string;
  rent?: number; deposit?: number; propertyId?: number;
  applicantCognitoId: string;
  applicantType: 'tenant' | 'buyer';
  [key: string]: any;
}

// ApplicationDocumentLean uses generic applicant
interface ApplicationDocumentLean {
  _id: Types.ObjectId | string; id: number; applicationDate?: Date | string; status: string;
  propertyId: number; applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
  name: string; email: string; phoneNumber: string; message?: string; leaseId?: number;
  [key: string]: any;
}

// --- Interfaces for Formatted Data in API Responses (GET) ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string; coordinates: ParsedPointCoordinates | null;
}
interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; location: FormattedLocationResponse | null; address?: string;
}
interface FormattedApplicantResponse extends Omit<ApplicantDocumentLean, '_id'> { // Generic for Tenant/Buyer
  _id: string;
}
interface FormattedOwnerResponse { // For Manager or Landlord
    _id: string; cognitoId: string; name?: string; email?: string; ownerType: 'manager' | 'landlord';
}

interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'startDate' | 'endDate' | '_id'> {
  _id: string; startDate?: string; endDate?: string; nextPaymentDate: string | null;
}

// FormattedApplicationResponse uses generic applicant and owner
interface FormattedApplicationResponse extends Omit<ApplicationDocumentLean, 'applicationDate' | 'propertyId' | 'applicantCognitoId' | 'applicantType' | 'leaseId' | '_id'> {
  _id: string; applicationDate?: string;
  property: FormattedPropertyResponse | null;
  applicant: FormattedApplicantResponse | null;
  applicantType: 'tenant' | 'buyer';
  owner: FormattedOwnerResponse | null; // Property owner (Manager or Landlord)
  lease: FormattedLeaseResponse | null;
}

// --- Interfaces for POST Request and Response ---
interface ApplicationPostBody {
  status: string; propertyId: number; applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
  name: string; email: string; phoneNumber: string; message?: string;
}

// NewLeaseData uses generic applicant
interface NewLeaseData {
    id: number; startDate: Date; endDate: Date; rent?: number; deposit?: number;
    propertyId: number; applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
}
// NewApplicationData uses generic applicant
interface NewApplicationData {
    id: number; applicationDate: Date; status: string; propertyId: number;
    applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
    name: string; email: string; phoneNumber: string; message?: string; leaseId?: number;
}

// CreatedApplicationResponse uses generic applicant
interface CreatedApplicationResponse {
  _id: string; id: number; applicationDate: string; status: string;
  name: string; email: string; phoneNumber: string; message?: string;
  property: { _id: string; id: number; pricePerMonth?: number; securityDeposit?: number; location: null; [key: string]: any; } | null;
  applicant: { _id: string; id?: number; cognitoId: string; [key: string]: any; } | null;
  applicantType: 'tenant' | 'buyer';
  lease: {
    _id: string; id: number; startDate: string; endDate: string; rent?: number; deposit?: number;
    propertyId: number; applicantCognitoId: string; applicantType: 'tenant' | 'buyer'; [key: string]: any;
  } | null;
}

// MongoQueryFilter uses generic applicant or owner context
interface MongoQueryFilter {
  applicantCognitoId?: string;
  applicantType?: 'tenant' | 'buyer';
  propertyId?: { $in: number[] } | number;
  $or?: ({ managerCognitoId: string } | { landlordCognitoId: string })[]; // For properties owned by a manager or landlord
  [key: string]: any;
}

interface MongooseValidationError { name: 'ValidationError'; message: string; errors: { [key: string]: { message: string } } }
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}
// --- END Unified Type Definitions ---

function parseWKTPoint(wktString: string | null | undefined): ParsedPointCoordinates | null {
    if (!wktString || typeof wktString !== 'string') return null;
    const match = wktString.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match?.[1] && match[2]) {
        const longitude = parseFloat(match[1]);
        const latitude = parseFloat(match[2]);
        if (!isNaN(longitude) && !isNaN(latitude)) return { longitude, latitude };
    }
    return null;
}

function calculateNextPaymentDate(startDateInput: string | Date): Date | null {
    if (!startDateInput) return null;
    const startDate = typeof startDateInput === 'string' ? new Date(startDateInput) : startDateInput;
    if (isNaN(startDate.getTime())) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const nextPaymentDate = new Date(startDate); nextPaymentDate.setHours(0,0,0,0);
    if (nextPaymentDate > today) return nextPaymentDate;
    while (nextPaymentDate <= today) nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    return nextPaymentDate;
}

// --- GET Handler (List Applications) ---
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // This is cognitoId
    const userType = searchParams.get('userType') as 'tenant' | 'buyer' | 'manager' | 'landlord' | null;

    let mongoWhereClause: MongoQueryFilter = {};

    if (userId && userType) {
      if (userType === 'tenant' || userType === 'buyer') {
        mongoWhereClause.applicantCognitoId = userId;
        mongoWhereClause.applicantType = userType;
      } else if (userType === 'manager' || userType === 'landlord') {
        // Find properties associated with this manager or landlord
        const propertyOwnerQuery = userType === 'manager'
            ? { managerCognitoId: userId }
            : { landlordCognitoId: userId };
        const ownerProperties = await Property.find(propertyOwnerQuery).select('id').lean().exec() as PropertyIdOnlyLean[];
        const ownerPropertyIds = ownerProperties.map(p => p.id);

        if (ownerPropertyIds.length > 0) {
          mongoWhereClause.propertyId = { $in: ownerPropertyIds };
        } else {
          // No properties found for this owner, so no applications to show
          return NextResponse.json([] as FormattedApplicationResponse[], { status: 200 });
        }
      }
    }

    const applicationsFromDb = await Application.find(mongoWhereClause).lean().exec() as ApplicationDocumentLean[];

    const formattedApplications: FormattedApplicationResponse[] = await Promise.all(
      applicationsFromDb.map(async (app): Promise<FormattedApplicationResponse> => {
        let propertyData: FormattedPropertyResponse | null = null;
        let ownerData: FormattedOwnerResponse | null = null; // For Manager or Landlord
        let applicantData: FormattedApplicantResponse | null = null;
        let leaseData: FormattedLeaseResponse | null = null;

        const { _id: appId, applicationDate: appDate, applicantType: appApplicantType, ...restOfApp } = app;

        if (app.propertyId) {
          const prop = await Property.findOne({ id: app.propertyId }).lean().exec() as PropertyDocumentLean | null;
          if (prop) {
            let locationData: FormattedLocationResponse | null = null;
            const { _id: propId, locationId, managerCognitoId, landlordCognitoId, ...restOfProp } = prop;
            if (locationId) {
              const loc = await Location.findOne({ id: locationId }).lean().exec() as LocationDocumentLean | null;
              if (loc) {
                const { _id: locId, coordinates, ...restOfLocDb } = loc;
                locationData = { ...restOfLocDb, _id: locId.toString(), id: loc.id, coordinates: parseWKTPoint(coordinates) };
              }
            }
            propertyData = { ...restOfProp, _id: propId.toString(), id: prop.id, location: locationData, address: locationData?.address };

            // Fetch owner (Manager or Landlord)
            if (managerCognitoId) {
                const manager = await Manager.findOne({ cognitoId: managerCognitoId }).select('_id cognitoId name email').lean().exec() as Omit<ManagerDocumentLean, 'id'> | null;
                if (manager) ownerData = { ...manager, _id: manager._id.toString(), ownerType: 'manager' };
            } else if (landlordCognitoId) {
                const landlord = await Landlord.findOne({ cognitoId: landlordCognitoId }).select('_id cognitoId name email').lean().exec() as Omit<LandlordDocumentLean, 'id'> | null; // Assuming Landlord model
                if (landlord) ownerData = { ...landlord, _id: landlord._id.toString(), ownerType: 'landlord' };
            }
          }
        }

        if (app.applicantCognitoId && app.applicantType) {
          const ApplicantModel = app.applicantType === 'tenant' ? Tenant : Buyer;
          const userDoc = await ApplicantModel.findOne({ cognitoId: app.applicantCognitoId })
            .select('_id cognitoId name email phoneNumber') // Common fields
            .lean().exec() as ApplicantDocumentLean | null;
          if (userDoc) applicantData = { ...userDoc, _id: userDoc._id.toString() };
        }

        if (app.leaseId) {
          const lease = await Lease.findOne({ id: app.leaseId }).lean().exec() as LeaseDocumentLean | null;
          if (lease) {
            const { _id: leaseIdDb, startDate, endDate, ...restOfLease } = lease;
            leaseData = {
              ...restOfLease, _id: leaseIdDb.toString(), id: lease.id,
              startDate: startDate ? new Date(startDate).toISOString() : undefined,
              endDate: endDate ? new Date(endDate).toISOString() : undefined,
              nextPaymentDate: calculateNextPaymentDate(lease.startDate as string | Date)
            };
          }
        }

        return {
          ...restOfApp, _id: appId.toString(), id: app.id,
          applicationDate: appDate ? new Date(appDate).toISOString() : undefined,
          property: propertyData, applicant: applicantData, applicantType: appApplicantType,
          owner: ownerData, lease: leaseData,
        };
      })
    );
    return NextResponse.json(formattedApplications, { status: 200 });
  } catch (error: unknown) {
    console.error('Error retrieving applications:', error);
    const msg = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error retrieving applications: ${msg}` }, { status: 500 });
  }
}

// --- POST Handler (Create Application) ---
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body: ApplicationPostBody = await request.json();
    const { status, propertyId, applicantCognitoId, applicantType, name, email, phoneNumber, message } = body;

    if (!propertyId || !applicantCognitoId || !applicantType || !name || !email || !phoneNumber || !status) {
      return NextResponse.json({ message: 'Missing required fields for application' }, { status: 400 });
    }
    if (applicantType !== 'tenant' && applicantType !== 'buyer') {
        return NextResponse.json({ message: 'Invalid applicant type provided.' }, { status: 400 });
    }

    const property = await Property.findOne({ id: propertyId })
      .select('pricePerMonth securityDeposit id _id').lean().exec() as
      (Pick<PropertyDocumentLean, 'pricePerMonth' | 'securityDeposit' | 'id' | '_id'>) | null;
    if (!property) return NextResponse.json({ message: 'Property not found' }, { status: 404 });

    const ApplicantModel = applicantType === 'tenant' ? Tenant : Buyer;
    const applicant = await ApplicantModel.findOne({ cognitoId: applicantCognitoId })
      .select('id cognitoId _id name email phoneNumber').lean().exec() as ApplicantDocumentLean | null;
    if (!applicant) return NextResponse.json({ message: `${applicantType.charAt(0).toUpperCase() + applicantType.slice(1)} not found` }, { status: 404 });

    // Lease Creation - happens for both tenants and buyers
    const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextLeaseId = (lastLease?.id ?? 0) + 1;
    const newLeaseData: NewLeaseData = {
        id: nextLeaseId, startDate: new Date(), endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: property.pricePerMonth, deposit: property.securityDeposit, propertyId: property.id,
        applicantCognitoId: applicant.cognitoId, applicantType: applicantType,
    };
    const newLease = new Lease(newLeaseData);
    const savedLease = await newLease.save();

    // Application Creation
    const lastApplication = await Application.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
    const nextApplicationId = (lastApplication?.id ?? 0) + 1;
    const newApplicationData: NewApplicationData = {
      id: nextApplicationId, applicationDate: new Date(), status, propertyId: property.id,
      applicantCognitoId: applicant.cognitoId, applicantType: applicantType,
      name, email, phoneNumber, message, leaseId: savedLease.id,
    };
    const newApplication = new Application(newApplicationData);
    const savedApplication = await newApplication.save();

    const savedAppObject = savedApplication.toObject({ virtuals: true }) as ApplicationDocumentLean;
    const savedLeaseObject = savedLease.toObject({ virtuals: true }) as LeaseDocumentLean;

    const applicationToReturn: CreatedApplicationResponse = {
        _id: savedAppObject._id.toString(), id: savedAppObject.id,
        applicationDate: new Date(savedAppObject.applicationDate || Date.now()).toISOString(),
        status: savedAppObject.status, name: savedAppObject.name, email: savedAppObject.email,
        phoneNumber: savedAppObject.phoneNumber, message: savedAppObject.message,
        property: property ? { ...property, _id: property._id.toString(), location: null } : null,
        applicant: applicant ? { ...applicant, _id: applicant._id.toString(), id: applicant.id } : null,
        applicantType: applicantType,
        lease: savedLeaseObject ? {
            ...savedLeaseObject, _id: savedLeaseObject._id.toString(), id: savedLeaseObject.id,
            startDate: new Date(savedLeaseObject.startDate || Date.now()).toISOString(),
            endDate: new Date(savedLeaseObject.endDate || Date.now()).toISOString(),
            propertyId: savedLeaseObject.propertyId!, applicantCognitoId: savedLeaseObject.applicantCognitoId!,
            applicantType: savedLeaseObject.applicantType!,
        } : null,
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