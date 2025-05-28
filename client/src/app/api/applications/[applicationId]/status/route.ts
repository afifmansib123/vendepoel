// src/app/api/applications/[applicationId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application'; // Ensure this model uses applicantCognitoId & applicantType
import Lease from '@/lib/models/Lease';         // Ensure this model uses applicantCognitoId & applicantType
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';
import Manager from '@/lib/models/Manager';
import Location from '@/lib/models/Location';
import Buyer from '@/lib/models/Buyer'; // Import Buyer model

// --- START Type Definitions (Modified for Buyers) ---

interface HandlerContext {
  params: { applicationId: string };
}
interface UpdateStatusBody { status: string }
interface ParsedPointCoordinates { longitude: number; latitude: number }

interface LocationDocumentLean {
  _id: Types.ObjectId | string; id: number; address?: string; city?: string; state?: string;
  country?: string; postalCode?: string; coordinates?: string; [key: string]: any;
}
interface PropertyDocumentLean {
  _id: Types.ObjectId | string; id: number; managerCognitoId?: string; locationId?: number;
  pricePerMonth?: number; securityDeposit?: number; tenants?: string[]; buyers?: string[]; // Add buyers here if property tracks them
  [key: string]: any;
}
interface UserBaseDocumentLean { // Common for Tenant & Buyer
  _id: Types.ObjectId | string; id?: number; cognitoId: string; name?: string; email?: string; phoneNumber?: string; [key: string]: any;
}
interface TenantDocumentLean extends UserBaseDocumentLean {}
interface BuyerDocumentLean extends UserBaseDocumentLean {}
interface ManagerDocumentLean {
  _id: Types.ObjectId | string; cognitoId: string; name?: string; email?: string; [key: string]: any;
}

// LeaseDocumentLean uses generic applicant
interface LeaseDocumentLean {
  _id: Types.ObjectId | string; id: number; startDate?: Date | string; endDate?: Date | string;
  rent?: number; deposit?: number; propertyId?: number;
  applicantCognitoId: string; // Generic applicant ID
  applicantType: 'tenant' | 'buyer'; // To distinguish
  [key: string]: any;
}

// ApplicationDocumentLean uses generic applicant
interface ApplicationDocumentLean {
  _id: Types.ObjectId | string; id: number; status: string; propertyId: number;
  applicantCognitoId: string; // Generic applicant ID
  applicantType: 'tenant' | 'buyer'; // To distinguish
  leaseId?: number; applicationDate?: Date | string; name?: string; email?: string;
  phoneNumber?: string; message?: string; [key: string]: any;
}

// NewLeaseData uses generic applicant
interface NewLeaseData {
  id: number; startDate: Date; endDate: Date; rent?: number; deposit?: number;
  propertyId: number; applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
}
interface ApplicationUpdatePayload { status: string; leaseId?: number }

// --- Interfaces for Formatted Data in API Response (Modified for Buyers) ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string; coordinates: ParsedPointCoordinates | null;
}
interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id'> {
  _id: string; location: FormattedLocationResponse | null; address?: string;
}
interface FormattedUserResponse extends Omit<UserBaseDocumentLean, '_id'> { // Generic for Tenant/Buyer
  _id: string;
}
interface FormattedManagerResponse extends Omit<ManagerDocumentLean, '_id'> {
    _id: string;
}
interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'startDate' | 'endDate' | '_id' | 'applicantCognitoId' | 'applicantType'> {
  _id: string; startDate?: string; endDate?: string; nextPaymentDate: string | null;
  applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
}
// FormattedApplicationResponse uses generic applicant
interface FormattedApplicationResponse extends Omit<ApplicationDocumentLean, 'applicationDate' | '_id' | 'applicantCognitoId' | 'applicantType'> {
  _id: string; applicationDate?: string;
  property: FormattedPropertyResponse | null;
  applicant: FormattedUserResponse | null; // Generic applicant
  applicantType: 'tenant' | 'buyer';
  manager: FormattedManagerResponse | null;
  lease: FormattedLeaseResponse | null;
}

interface MongooseValidationError {
  name: 'ValidationError'; message: string; errors: { [key: string]: { message: string; [key: string]: any } };
}
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}
// --- END Type Definitions ---


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
  context: HandlerContext
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
      .exec() as unknown as ApplicationDocumentLean | null; // Type now includes applicantCognitoId & applicantType

    if (!application) {
      return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
    }

    // Validate essential fields from the application document
    if (
      typeof application.propertyId !== 'number' ||
      typeof application.applicantCognitoId !== 'string' ||
      !application.applicantType ||
      (application.applicantType !== 'tenant' && application.applicantType !== 'buyer')
    ) {
        console.error(`Application ${numericAppId} has incomplete or invalid applicant data.`);
        return NextResponse.json({ message: 'Application data is incomplete or invalid.' }, { status: 500 });
    }

    const propertyForApp = await Property.findOne({ id: application.propertyId })
      .lean()
      .exec() as unknown as PropertyDocumentLean | null;

    if (!propertyForApp) {
      return NextResponse.json({ message: 'Associated property not found.' }, { status: 404 });
    }

    let updatedLeaseId: number | undefined = application.leaseId;
    let savedLease: LeaseDocumentLean | null = null; // To hold the newly created lease document for the response

    if (status === 'Approved' && !application.leaseId) {
      const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
      const nextLeaseId = (lastLease && typeof lastLease.id === 'number' ? lastLease.id : 0) + 1;

      const newLeaseData: NewLeaseData = { // Uses applicantCognitoId and applicantType
        id: nextLeaseId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: propertyForApp.pricePerMonth,
        deposit: propertyForApp.securityDeposit,
        propertyId: application.propertyId,
        applicantCognitoId: application.applicantCognitoId,
        applicantType: application.applicantType,
      };
      const newLeaseInstance = new Lease(newLeaseData);
      const createdLeaseMongooseDoc = await newLeaseInstance.save();
      savedLease = createdLeaseMongooseDoc.toObject({ virtuals: true }) as LeaseDocumentLean; // Store for response
      updatedLeaseId = savedLease.id;

      // Add applicant to property's list of occupants (tenants or buyers)
      // This assumes your Property schema has 'tenants: [String]' and 'buyers: [String]'
      const updatePropertyQuery = application.applicantType === 'tenant'
        ? { $addToSet: { tenants: application.applicantCognitoId } }
        : { $addToSet: { buyers: application.applicantCognitoId } }; // Add to buyers list if property tracks it

      await Property.updateOne({ id: application.propertyId }, updatePropertyQuery);
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
      return NextResponse.json({ message: 'Failed to retrieve updated application.' }, { status: 500 });
    }

    // --- Populate response data ---
    let propertyDataResp: FormattedPropertyResponse | null = null;
    let managerDataResp: FormattedManagerResponse | null = null;
    let applicantDataResp: FormattedUserResponse | null = null; // Generic applicant
    let leaseDataResp: FormattedLeaseResponse | null = null;

    const { _id: finalApp_Id, applicationDate: finalAppDate, applicantType: finalAppApplicantType, ...restOfFinalApp } = finalApplicationRaw;

    // Populate property and manager (same as before)
    if (finalApplicationRaw.propertyId) {
        const prop = await Property.findOne({ id: finalApplicationRaw.propertyId }).lean().exec() as PropertyDocumentLean | null;
        if (prop) {
            let locationData: FormattedLocationResponse | null = null;
            const { _id: prop_Id, locationId: propLocationId, ...restOfProp } = prop;
            if (propLocationId) {
                const loc = await Location.findOne({ id: propLocationId }).lean().exec() as LocationDocumentLean | null;
                if (loc) {
                    const { _id: loc_Id, coordinates: locCoords, ...restOfLocDb } = loc;
                    locationData = {
                        ...restOfLocDb, _id: typeof loc_Id === 'string' ? loc_Id : loc_Id.toString(),
                        id: loc.id, coordinates: parseWKTPoint(locCoords),
                    };
                }
            }
             if (prop.managerCognitoId) {
                const manager = await Manager.findOne({ cognitoId: prop.managerCognitoId }).select('-__v -createdAt -updatedAt -id').lean().exec() as Omit<ManagerDocumentLean, 'id'> | null;
                if (manager) {
                    const { _id: manager_Id, ...restOfManager } = manager;
                    managerDataResp = { ...restOfManager, _id: typeof manager_Id === 'string' ? manager_Id : manager_Id.toString(), cognitoId: manager.cognitoId };
                }
            }
            propertyDataResp = {
                ...restOfProp, _id: typeof prop_Id === 'string' ? prop_Id : prop_Id.toString(),
                id: prop.id, location: locationData, address: locationData?.address,
            };
        }
    }

    // Populate applicant data
    if (finalApplicationRaw.applicantCognitoId && finalApplicationRaw.applicantType) {
      let userDoc;
      if (finalApplicationRaw.applicantType === 'tenant') {
        userDoc = await Tenant.findOne({ cognitoId: finalApplicationRaw.applicantCognitoId })
          .select('-__v -createdAt -updatedAt -id -favorites -properties') // Adjust fields
          .lean().exec() as Omit<TenantDocumentLean, 'id' | 'favorites' | 'properties'> | null;
      } else { // applicantType === 'buyer'
        userDoc = await Buyer.findOne({ cognitoId: finalApplicationRaw.applicantCognitoId })
          .select('-__v -createdAt -updatedAt -id') // Adjust fields
          .lean().exec() as Omit<BuyerDocumentLean, 'id'> | null;
      }
      if (userDoc) {
        const { _id: userId, ...restOfUser } = userDoc;
        applicantDataResp = {
          ...restOfUser, _id: typeof userId === 'string' ? userId : userId.toString(),
          cognitoId: userDoc.cognitoId,
        };
      }
    }

    // Populate lease data
    // If a new lease was created, use `savedLease`, otherwise fetch from DB
    const leaseToFormat = savedLease || (finalApplicationRaw.leaseId
        ? await Lease.findOne({ id: finalApplicationRaw.leaseId }).lean().exec() as LeaseDocumentLean | null
        : null);

    if (leaseToFormat) {
        const { _id: lease_Id, startDate: leaseStartDate, endDate: leaseEndDate, applicantCognitoId: leaseAppCognitoId, applicantType: leaseAppType, ...restOfLease } = leaseToFormat;
        const nextPayment = calculateNextPaymentDate(leaseStartDate as string | Date);
        leaseDataResp = {
            ...restOfLease,
            _id: typeof lease_Id === 'string' ? lease_Id : lease_Id.toString(),
            id: leaseToFormat.id,
            startDate: leaseStartDate ? new Date(leaseStartDate).toISOString() : undefined,
            endDate: leaseEndDate ? new Date(leaseEndDate).toISOString() : undefined,
            nextPaymentDate: nextPayment ? nextPayment.toISOString() : null,
            applicantCognitoId: leaseAppCognitoId, // from LeaseDocumentLean
            applicantType: leaseAppType,         // from LeaseDocumentLean
        };
    }


    const responsePayload: FormattedApplicationResponse = {
        ...restOfFinalApp,
        _id: typeof finalApp_Id === 'string' ? finalApp_Id : finalApp_Id.toString(),
        id: finalApplicationRaw.id,
        applicationDate: finalAppDate ? new Date(finalAppDate).toISOString() : undefined,
        property: propertyDataResp,
        applicant: applicantDataResp,
        applicantType: finalAppApplicantType,
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