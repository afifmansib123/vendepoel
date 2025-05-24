// src/app/api/applications/[applicationId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application';
import Lease from '@/lib/models/Lease';
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant'; // Needed for populating response
import Manager from '@/lib/models/Manager'; // Needed for populating response
import Location from '@/lib/models/Location'; // Needed for populating response


// Helper for WKT parsing
function parseWKTPoint(wktString: string | null | undefined): { longitude: number; latitude: number } | null {
    // ... (same parseWKTPoint function) ...
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
    // ... (same calculateNextPaymentDate function) ...
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
  { params }: { params: { applicationId: string } }
) {
  await dbConnect();
  const { applicationId: appIdStr } = params;
  const numericAppId = Number(appIdStr);

  if (isNaN(numericAppId)) {
    return NextResponse.json({ message: 'Invalid Application ID format' }, { status: 400 });
  }

  try {
    const { status } = await request.json(); // New status: "Approved", "Denied", etc.
    if (!status) {
      return NextResponse.json({ message: 'Status is required in body' }, { status: 400 });
    }

    const application = await Application.findOne({ id: numericAppId }).lean().exec(); // Find by numeric id
    if (!application) {
      return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
    }

    // Fetch related property for lease creation if approved
    const propertyForApp = await Property.findOne({ id: application.propertyId as number }).lean().exec();
    if (!propertyForApp) {
      return NextResponse.json({ message: 'Associated property not found.' }, { status: 404 });
    }

    let updatedLeaseId = application.leaseId; // Keep existing leaseId unless new one is created

    if (status === 'Approved' && !application.leaseId) { // Only create lease if status is Approved AND no lease is linked yet
      const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean();
      const nextLeaseId = (lastLease && typeof lastLease.id === 'number' ? lastLease.id : 0) + 1;

      const newLease = new Lease({
        id: nextLeaseId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: propertyForApp.pricePerMonth,
        deposit: propertyForApp.securityDeposit,
        propertyId: application.propertyId,       // numeric Property ID from application
        tenantCognitoId: application.tenantCognitoId, // Tenant Cognito ID from application
      });
      const savedLease = await newLease.save();
      updatedLeaseId = savedLease.id; // Link the new lease's numeric id

      // Update the property to connect the tenant (if your Property schema supports this)
      // This assumes Property.tenants is an array of tenant cognitoIds
      await Property.updateOne(
        { id: application.propertyId },
        { $addToSet: { tenants: application.tenantCognitoId } } // Add tenant's cognitoId if not already present
      );
    }

    // Update the application status and potentially the leaseId
    const updatePayload: any = { status };
    if (updatedLeaseId !== application.leaseId) { // If a new lease was created and linked
        updatePayload.leaseId = updatedLeaseId;
    }

    await Application.updateOne({ id: numericAppId }, { $set: updatePayload });

    // Fetch and return the fully populated application for the response
    const finalApplication = await Application.findOne({ id: numericAppId }).lean().exec();
    let propertyData = null;
    let managerData = null;
    let tenantData = null;
    let leaseDataWithNextPayment = null;

    if (finalApplication?.propertyId) {
        const prop = await Property.findOne({ id: finalApplication.propertyId }).lean().exec();
        if (prop) {
            let locationData = null;
            if (prop.locationId) {
                const loc = await Location.findOne({ id: prop.locationId }).lean().exec();
                if (loc) locationData = { ...loc, coordinates: parseWKTPoint(loc.coordinates as string | undefined) };
            }
            if (prop.managerCognitoId) managerData = await Manager.findOne({ cognitoId: prop.managerCognitoId }).select('-__v -createdAt -updatedAt -id').lean().exec();
            propertyData = { ...prop, location: locationData, address: locationData?.address };
        }
    }
    if (finalApplication?.tenantCognitoId) tenantData = await Tenant.findOne({ cognitoId: finalApplication.tenantCognitoId }).select('-__v -createdAt -updatedAt -id -favorites -properties').lean().exec();
    if (finalApplication?.leaseId) {
        const lease = await Lease.findOne({ id: finalApplication.leaseId }).lean().exec();
        if (lease) leaseDataWithNextPayment = { ...lease, nextPaymentDate: calculateNextPaymentDate(lease.startDate as Date) };
    }

    return NextResponse.json({
        ...finalApplication,
        property: propertyData,
        tenant: tenantData,
        manager: managerData,
        lease: leaseDataWithNextPayment,
    }, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating application ${numericAppId} status:`, error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating application status: ${error.message}` }, { status: 500 });
  }
}