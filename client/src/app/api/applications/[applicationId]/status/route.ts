// src/app/api/applications/[applicationId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application';
import Lease from '@/lib/models/Lease';
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';
import Buyer from '@/lib/models/Buyer'; // Assuming Buyer model exists
import Manager from '@/lib/models/Manager';
import Landlord from '@/lib/models/Landlord'; // Import Landlord
import Location from '@/lib/models/Location';

// --- START Type Definitions ---

interface HandlerContext {
  params: { applicationId: string };
}
interface UpdateStatusBody { status: 'Approved' | 'Denied' | 'Pending' | string } // Be more specific if possible
interface ParsedPointCoordinates { longitude: number; latitude: number }

// --- Model-Specific Lean Document Interfaces ---
interface LocationDocumentLean {
  _id: Types.ObjectId | string; id: number; address?: string; city?: string; state?: string;
  country?: string; postalCode?: string; coordinates?: string; [key: string]: any;
}
interface PropertyDocumentLean {
  _id: Types.ObjectId | string; id: number; managerCognitoId?: string; locationId?: number;
  name?: string; // Added property name
  pricePerMonth?: number; securityDeposit?: number;
  tenants?: string[]; // Array of Tenant Cognito IDs
  buyers?: string[];  // Array of Buyer Cognito IDs
  [key: string]: any;
}
interface UserBaseDocumentLean {
  _id: Types.ObjectId | string; id?: number; cognitoId: string; name?: string; email?: string; phoneNumber?: string; [key: string]: any;
}
interface TenantDocumentLean extends UserBaseDocumentLean {}
interface BuyerDocumentLean extends UserBaseDocumentLean {}

interface ManagerDocumentLean {
  _id: Types.ObjectId | string; cognitoId: string; name?: string; email?: string; [key: string]: any;
}
interface LandlordDocumentLean {
  _id: Types.ObjectId | string; cognitoId: string; name?: string; email?: string; [key: string]: any;
}
type OwnerDocumentLean = ManagerDocumentLean | LandlordDocumentLean;


interface LeaseDocumentLean {
  _id: Types.ObjectId | string; id: number; startDate?: Date | string; endDate?: Date | string;
  rent?: number; deposit?: number; propertyId: number; // propertyId is required
  applicantCognitoId: string;
  applicantType: 'tenant' | 'buyer';
  [key: string]: any;
}
interface ApplicationDocumentLean {
  _id: Types.ObjectId | string; id: number; status: string; propertyId: number;
  applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
  leaseId?: number; applicationDate?: Date | string; name: string; email: string; // name, email, phone are from application form
  phoneNumber: string; message?: string; [key: string]: any;
}

// --- Data for new Lease creation & Application Update ---
interface NewLeaseData {
  id: number; startDate: Date; endDate: Date; rent?: number; deposit?: number;
  propertyId: number; applicantCognitoId: string; applicantType: 'tenant' | 'buyer';
}
interface ApplicationUpdatePayload { status: string; leaseId?: number }


// --- Interfaces for Formatted Data in API Response ---
interface FormattedLocationResponse extends Omit<LocationDocumentLean, 'coordinates' | '_id'> {
  _id: string; coordinates: ParsedPointCoordinates | null;
}
interface FormattedPropertyResponse extends Omit<PropertyDocumentLean, 'locationId' | '_id' | 'tenants' | 'buyers'> { // Excluded tenants/buyers arrays
  _id: string; location: FormattedLocationResponse | null; address?: string; name?: string;
}
interface FormattedUserResponse extends Omit<UserBaseDocumentLean, '_id'> {
  _id: string;
}
interface FormattedOwnerResponse extends Omit<OwnerDocumentLean, '_id'>{ // For Manager or Landlord
    _id: string;
}
interface FormattedLeaseResponse extends Omit<LeaseDocumentLean, 'startDate' | 'endDate' | '_id'> {
  _id: string; startDate?: string; endDate?: string; nextPaymentDate: string | null;
}
interface FormattedApplicationResponse extends Omit<ApplicationDocumentLean, 'applicationDate' | '_id' | 'propertyId' | 'applicantCognitoId' | 'applicantType' | 'leaseId'> {
  _id: string; applicationDate?: string;
  property: FormattedPropertyResponse | null;
  applicant: FormattedUserResponse | null;
  applicantType: 'tenant' | 'buyer';
  owner: FormattedOwnerResponse | null; // Changed from manager
  lease: FormattedLeaseResponse | null;
}

// --- Utility Types ---
interface MongooseValidationError {
  name: 'ValidationError'; message: string; errors: { [key: string]: { message: string; [key: string]: any } };
}
function isMongooseValidationError(error: any): error is MongooseValidationError {
  return error && error.name === 'ValidationError' && typeof error.errors === 'object' && error.errors !== null;
}
// --- END Type Definitions ---

// Helper functions (ensure these are fully implemented as in your previous code)
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
    const { status: newStatus } = body; // Renamed to newStatus for clarity

    if (!newStatus) {
      return NextResponse.json({ message: 'Status is required in body' }, { status: 400 });
    }

    // Fetch the application Mongoose document (not lean, as we check its properties before deciding to create a lease)
    const applicationDoc = await Application.findOne({ id: numericAppId }).exec();

    if (!applicationDoc) {
      return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
    }



    const propertyForApp = await Property.findOne({ id: applicationDoc.propertyId })
      .lean() // Can be lean as we only read from it
      .exec() as PropertyDocumentLean | null;

    if (!propertyForApp) {
      // This should be rare if application.propertyId is valid
      return NextResponse.json({ message: 'Associated property not found. Cannot process application status.' }, { status: 404 });
    }

    let newOrExistingLeaseId: number | undefined = applicationDoc.leaseId;
    let createdLeaseForResponse: LeaseDocumentLean | null = null; // To hold the newly created lease for the response

    if (newStatus === 'Approved') {
      // Only create a new lease if the application doesn't already have one
      if (!applicationDoc.leaseId) {
        const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean().exec() as { id?: number } | null;
        const nextNumericLeaseId = (lastLease?.id ?? 0) + 1;

        const leaseStartDate = new Date();
        const leaseEndDate = new Date(leaseStartDate);
        leaseEndDate.setFullYear(leaseStartDate.getFullYear() + 1);

        const newLeaseData: NewLeaseData = {
          id: nextNumericLeaseId,
          startDate: leaseStartDate,
          endDate: leaseEndDate,
          rent: propertyForApp.pricePerMonth,
          deposit: propertyForApp.securityDeposit,
          propertyId: applicationDoc.propertyId,
          applicantCognitoId: applicationDoc.applicantCognitoId,
          applicantType: applicationDoc.applicantType,
        };
        const newLeaseInstance = new Lease(newLeaseData);
        const savedLeaseDoc = await newLeaseInstance.save();
        createdLeaseForResponse = savedLeaseDoc.toObject({ virtuals: true }) as LeaseDocumentLean;
        newOrExistingLeaseId = createdLeaseForResponse.id;
        console.log(`New lease ${newOrExistingLeaseId} created for approved application ${numericAppId}.`);
      } else {
        console.log(`Application ${numericAppId} already has lease ${applicationDoc.leaseId}. Not creating new lease.`);
      }

      // Add applicant's cognitoId to the property's relevant occupants array
      if (applicationDoc.applicantCognitoId) {
        const updatePropertyQuery = applicationDoc.applicantType === 'tenant'
          ? { $addToSet: { tenants: applicationDoc.applicantCognitoId } }
          : { $addToSet: { buyers: applicationDoc.applicantCognitoId } };
        await Property.updateOne({ id: applicationDoc.propertyId }, updatePropertyQuery);
        console.log(`Applicant ${applicationDoc.applicantCognitoId} (${applicationDoc.applicantType}) added to property ${applicationDoc.propertyId}.`);
      }
    } else if (newStatus === 'Denied') {
      // Optional: Logic for when an application is denied.
      // e.g., if it was previously approved and a lease existed, you might want to
      // remove the applicant from property.tenants/buyers or void the lease.
      // This depends heavily on business rules.
      console.log(`Application ${numericAppId} set to status: ${newStatus}.`);
       if (applicationDoc.applicantCognitoId && applicationDoc.leaseId) { // If was previously approved and had a lease
        const updatePropertyQuery = applicationDoc.applicantType === 'tenant'
          ? { $pull: { tenants: applicationDoc.applicantCognitoId } }
          : { $pull: { buyers: applicationDoc.applicantCognitoId } };
        // await Property.updateOne({ id: applicationDoc.propertyId }, updatePropertyQuery);
        // console.log(`Applicant ${applicationDoc.applicantCognitoId} (${applicationDoc.applicantType}) potentially removed from property ${applicationDoc.propertyId} due to denial.`);
        // Consider if lease needs to be voided: await Lease.updateOne({ id: applicationDoc.leaseId }, { status: 'Voided' });
      }
    }

    // Prepare and execute the application update
    const applicationUpdateData: ApplicationUpdatePayload = { status: newStatus };
    if (newOrExistingLeaseId !== undefined && newOrExistingLeaseId !== applicationDoc.leaseId) {
      applicationUpdateData.leaseId = newOrExistingLeaseId;
    }
    await Application.updateOne({ id: numericAppId }, { $set: applicationUpdateData });

    // Fetch the final state of the application for the response
    const finalApplicationRaw = await Application.findOne({ id: numericAppId })
      .lean().exec() as ApplicationDocumentLean | null;

    if (!finalApplicationRaw) {
      // This should ideally not happen if the update was successful
      return NextResponse.json({ message: 'Failed to retrieve updated application details.' }, { status: 500 });
    }

    // --- Populate response data ---
    let propertyDataResp: FormattedPropertyResponse | null = null;
    let ownerDataResp: FormattedOwnerResponse | null = null;
    let applicantDataResp: FormattedUserResponse | null = null;
    let leaseDataResp: FormattedLeaseResponse | null = null;

    const { _id: finalApp_Id, applicationDate: finalAppDate, applicantType: finalAppApplicantType, propertyId: finalAppPropId, applicantCognitoId: finalAppAppCognitoId, leaseId: finalAppLeaseId, ...restOfFinalApp } = finalApplicationRaw;

    // Populate property and its owner
    if (finalAppPropId) {
        const propDoc = await Property.findOne({ id: finalAppPropId }).select('-tenants -buyers').lean().exec() as PropertyDocumentLean | null; // Exclude tenants/buyers from direct response
        if (propDoc) {
            let locationData: FormattedLocationResponse | null = null;
            const { _id: propMongoId, locationId: propLocationId, managerCognitoId: propManagerCognitoId, ...restOfPropDoc } = propDoc;
            if (propLocationId) {
                const locDoc = await Location.findOne({ id: propLocationId }).lean().exec() as LocationDocumentLean | null;
                if (locDoc) {
                    const { _id: locMongoId, coordinates, ...restOfLoc } = locDoc;
                    locationData = { ...restOfLoc, _id: locMongoId.toString(), id: locDoc.id, coordinates: parseWKTPoint(coordinates) };
                }
            }
            propertyDataResp = { ...restOfPropDoc, _id: propMongoId.toString(), id: propDoc.id, location: locationData, address: locationData?.address, name: propDoc.name, managerCognitoId: propManagerCognitoId };

            if (propManagerCognitoId) {
                let ownerDoc: OwnerDocumentLean | null = await Landlord.findOne({ cognitoId: propManagerCognitoId }).select('cognitoId name email _id').lean().exec() as LandlordDocumentLean | null;
                if (!ownerDoc) {
                    ownerDoc = await Manager.findOne({ cognitoId: propManagerCognitoId }).select('cognitoId name email _id').lean().exec() as ManagerDocumentLean | null;
                }
                if (ownerDoc) {
                    ownerDataResp = { _id: ownerDoc._id.toString(), cognitoId: ownerDoc.cognitoId, name: ownerDoc.name, email: ownerDoc.email };
                }
            }
        }
    }

    // Populate applicant
    if (finalAppAppCognitoId && finalAppApplicantType) {
      let userDoc: UserBaseDocumentLean | null = null;
      const selectFields = 'cognitoId name email phoneNumber _id id'; // Adjust if 'id' (numeric) isn't on UserBase
      if (finalAppApplicantType === 'tenant') {
        userDoc = await Tenant.findOne({ cognitoId: finalAppAppCognitoId }).select(selectFields).lean().exec() as TenantDocumentLean | null;
      } else if (finalAppApplicantType === 'buyer') {
        userDoc = await Buyer.findOne({ cognitoId: finalAppAppCognitoId }).select(selectFields).lean().exec() as BuyerDocumentLean | null;
      }
      if (userDoc) {
        applicantDataResp = { _id: userDoc._id.toString(), cognitoId: userDoc.cognitoId, name: userDoc.name, email: userDoc.email, phoneNumber: userDoc.phoneNumber, id: userDoc.id };
      }
    }

    // Populate lease (use createdLeaseForResponse if available, otherwise fetch)
    const leaseToFormat = createdLeaseForResponse || (finalAppLeaseId
        ? await Lease.findOne({ id: finalAppLeaseId }).lean().exec() as LeaseDocumentLean | null
        : null);

    if (leaseToFormat) {
        const { _id: leaseMongoId, startDate, endDate, ...restOfLeaseDoc } = leaseToFormat;
        const nextPayment = calculateNextPaymentDate(startDate);
        leaseDataResp = {
            ...restOfLeaseDoc, _id: leaseMongoId.toString(), id: leaseToFormat.id,
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            endDate: endDate ? new Date(endDate).toISOString() : undefined,
            nextPaymentDate: nextPayment ? nextPayment.toISOString() : null,
        };
    }

    const responsePayload: FormattedApplicationResponse = {
        ...restOfFinalApp,
        _id: finalApp_Id.toString(), id: finalApplicationRaw.id,
        applicationDate: finalAppDate ? new Date(finalAppDate).toISOString() : undefined,
        property: propertyDataResp,
        applicant: applicantDataResp,
        applicantType: finalAppApplicantType,
        owner: ownerDataResp,
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