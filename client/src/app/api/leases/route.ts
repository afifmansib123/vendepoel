// src/app/api/leases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lease from '@/lib/models/Lease';     // Your Mongoose Lease model
import Tenant from '@/lib/models/Tenant';   // To populate tenant
import Property from '@/lib/models/Property'; // To populate property
// Import Location if Property population needs it for nested location details

// Helper for WKT parsing (if needed for nested property locations)
function parseWKTPoint(wktString: string | null | undefined): { longitude: number; latitude: number } | null {
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
    // Your Prisma query included tenant and property.
    // With Mongoose, we use .populate() if refs are ObjectIds.
    // If they are numeric IDs from "adjusted" schema, we populate manually or via aggregation.

    // Option 1: Using Mongoose .populate() if Lease schema has ObjectId refs
    // const leases = await Lease.find({})
    //   .populate('tenant') // Assumes Lease.tenant is ObjectId ref to Tenant
    //   .populate({
    //       path: 'property', // Assumes Lease.property is ObjectId ref to Property
    //       populate: {
    //           path: 'location' // Assumes Property.location is ObjectId ref to Location
    //       }
    //   })
    //   .lean()
    //   .exec();

    // Option 2: Manual population if using numeric IDs (more aligned with "adjusted" schema)
    const rawLeases = await Lease.find({}).lean().exec();
    const leases = await Promise.all(
        rawLeases.map(async (lease: any) => {
            let tenantData = null;
            let propertyData = null;

            // Populate Tenant:
            // Assuming Lease.tenant stores Tenant's ObjectId, or Lease.tenantCognitoId stores cognitoId
            if (lease.tenant) { // If Lease.tenant stores Tenant ObjectId
                tenantData = await Tenant.findById(lease.tenant).lean().exec();
            } else if (lease.tenantCognitoId) { // Or if it stores cognitoId
                tenantData = await Tenant.findOne({ cognitoId: lease.tenantCognitoId }).lean().exec();
            }


            // Populate Property:
            // Assuming Lease.propertyId stores numeric Property ID
            if (lease.propertyId) {
                const prop = await Property.findOne({ id: lease.propertyId }).lean().exec();
                if (prop) {
                    let locationData = null;
                    if (prop.locationId) { // Assuming Property has numeric locationId
                        const loc = await dbConnect().then(() => import('@/lib/models/Location')).then(mod => mod.default.findOne({ id: prop.locationId }).lean().exec());
                        if (loc) {
                            locationData = {
                                ...loc,
                                coordinates: parseWKTPoint(loc.coordinates as string | undefined)
                            };
                        }
                    }
                    propertyData = { ...prop, location: locationData };
                }
            }
            return { ...lease, tenant: tenantData, property: propertyData };
        })
    );


    return NextResponse.json(leases, { status: 200 });

  } catch (error: any) {
    console.error('Error retrieving leases:', error);
    return NextResponse.json({ message: `Error retrieving leases: ${error.message}` }, { status: 500 });
  }
}