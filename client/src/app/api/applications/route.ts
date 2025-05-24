// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/lib/models/Application';
import Property from '@/lib/models/Property';
import Tenant from '@/lib/models/Tenant';
import Manager from '@/lib/models/Manager';
import Location from '@/lib/models/Location';
import Lease from '@/lib/models/Lease';

// Helper for WKT parsing
function parseWKTPoint(wktString: string | null | undefined): { longitude: number; latitude: number } | null {
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
    today.setHours(0,0,0,0); // Normalize today to start of day

    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setHours(0,0,0,0); // Normalize start date

    // If start date is in the future, that's the first payment date
    if (nextPaymentDate > today) {
        return nextPaymentDate;
    }

    // Otherwise, advance month by month from start date until it's after today
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
    const userId = searchParams.get('userId');       // This is a cognitoId
    const userType = searchParams.get('userType'); // 'tenant' or 'manager'

    let mongoWhereClause: any = {};

    if (userId && userType) {
      if (userType === 'tenant') {
        mongoWhereClause.tenantCognitoId = userId;
      } else if (userType === 'manager') {
        // Find properties managed by this manager
        const managerProperties = await Property.find({ managerCognitoId: userId }).select('id').lean().exec();
        const managerPropertyIds = managerProperties.map(p => p.id as number);
        if (managerPropertyIds.length > 0) {
          mongoWhereClause.propertyId = { $in: managerPropertyIds };
        } else {
          return NextResponse.json([], { status: 200 }); // Manager has no properties, thus no applications on them
        }
      }
    }

    const applications = await Application.find(mongoWhereClause).lean().exec();

    const formattedApplications = await Promise.all(
      applications.map(async (app: any) => {
        let propertyData = null;
        let managerData = null;
        let tenantData = null;
        let leaseDataWithNextPayment = null;

        if (app.propertyId) {
          const prop = await Property.findOne({ id: app.propertyId }).lean().exec();
          if (prop) {
            let locationData = null;
            if (prop.locationId) {
              const loc = await Location.findOne({ id: prop.locationId }).lean().exec();
              if (loc) {
                locationData = { ...loc, coordinates: parseWKTPoint(loc.coordinates as string | undefined) };
              }
            }
            // Fetch manager for the property
            if (prop.managerCognitoId){
                managerData = await Manager.findOne({ cognitoId: prop.managerCognitoId }).select('-__v -createdAt -updatedAt -id').lean().exec(); // Exclude some fields
            }
            propertyData = { ...prop, location: locationData, address: locationData?.address }; // address for convenience
          }
        }

        if (app.tenantCognitoId) {
          tenantData = await Tenant.findOne({ cognitoId: app.tenantCognitoId }).select('-__v -createdAt -updatedAt -id -favorites -properties').lean().exec();
        }

        if (app.leaseId) { // If application is linked to a lease by its numeric ID
          const lease = await Lease.findOne({ id: app.leaseId }).lean().exec();
          if (lease) {
            leaseDataWithNextPayment = {
              ...lease,
              nextPaymentDate: calculateNextPaymentDate(lease.startDate as Date),
            };
          }
        } else { // Fallback: try to find lease by tenant and property (as in original prisma query)
             if (app.tenantCognitoId && app.propertyId) {
                 const leaseByTenantProp = await Lease.findOne({
                     tenantCognitoId: app.tenantCognitoId,
                     propertyId: app.propertyId
                 }).sort({ startDate: -1 }).lean().exec(); // Get latest lease
                 if (leaseByTenantProp) {
                    leaseDataWithNextPayment = {
                        ...leaseByTenantProp,
                        nextPaymentDate: calculateNextPaymentDate(leaseByTenantProp.startDate as Date),
                    };
                 }
             }
        }


        return {
          ...app,
          property: propertyData,
          tenant: tenantData,
          manager: managerData, // Added manager to the application response as per original
          lease: leaseDataWithNextPayment,
        };
      })
    );

    return NextResponse.json(formattedApplications, { status: 200 });
  } catch (error: any) {
    console.error('Error retrieving applications:', error);
    return NextResponse.json({ message: `Error retrieving applications: ${error.message}` }, { status: 500 });
  }
}

// --- POST Handler (Create Application) ---
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const {
      // applicationDate, // Original prisma took this, Mongoose schema has default: Date.now
      status, // e.g., "Pending"
      propertyId, // numeric Property ID
      tenantCognitoId,
      name,
      email,
      phoneNumber,
      message,
    } = body;

    if (!propertyId || !tenantCognitoId || !name || !email || !phoneNumber || !status) {
      return NextResponse.json({ message: 'Missing required fields for application' }, { status: 400 });
    }

    // Verify property exists
    const property = await Property.findOne({ id: propertyId }).select('pricePerMonth securityDeposit id').lean().exec();
    if (!property) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    // Verify tenant exists
    const tenant = await Tenant.findOne({ cognitoId: tenantCognitoId }).select('id cognitoId').lean().exec();
    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    // Original Prisma logic created a Lease and Application in a transaction.
    // Mongoose doesn't have transactions in the same way across multiple saves without replica sets.
    // We'll create them sequentially. If lease creation is ONLY for approved apps, this logic changes.
    // Your original createApplication creates a lease immediately. Let's replicate that.

    const lastLease = await Lease.findOne().sort({ id: -1 }).select('id').lean();
    const nextLeaseId = (lastLease && typeof lastLease.id === 'number' ? lastLease.id : 0) + 1;

    const newLease = new Lease({
        id: nextLeaseId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent: property.pricePerMonth,
        deposit: property.securityDeposit,
        propertyId: property.id, // numeric property id
        tenantCognitoId: tenant.cognitoId, // tenant cognito id
        // If your Lease schema links to Tenant._id via `tenant: ObjectId`, you'd use tenant._id
    });
    const savedLease = await newLease.save();

    const lastApplication = await Application.findOne().sort({ id: -1 }).select('id').lean();
    const nextApplicationId = (lastApplication && typeof lastApplication.id === 'number' ? lastApplication.id : 0) + 1;

    const newApplication = new Application({
      id: nextApplicationId,
      applicationDate: new Date(), // Mongoose default will also set this
      status,
      propertyId: property.id, // numeric property id
      tenantCognitoId: tenant.cognitoId,
      name, email, phoneNumber, message,
      leaseId: savedLease.id, // Link to the numeric id of the created lease
    });
    const savedApplication = await newApplication.save();

    // For the response, populate related data similar to GET
    const applicationToReturn = {
        ...savedApplication.toObject(),
        property: { ...property, location: null /* TODO: Populate location if needed for response */ },
        tenant: { ...tenant },
        lease: { ...savedLease.toObject() }
    };

    return NextResponse.json(applicationToReturn, { status: 201 });

  } catch (error: any) {
    console.error('Error creating application:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error creating application: ${error.message}` }, { status: 500 });
  }
}