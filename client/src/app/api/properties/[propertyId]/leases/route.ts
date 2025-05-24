// src/app/api/properties/[propertyId]/leases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lease from '@/lib/models/Lease';     // Your Mongoose Lease model
import Tenant from '@/lib/models/Tenant';   // To populate tenant
import Property from '@/lib/models/Property'; // To populate property within lease (or verify property exists)
// Import Location if Property population needs it

// Helper for WKT parsing
function parseWKTPoint(wktString: string | null | undefined): { longitude: number; latitude: number } | null {
    // ... (same parseWKTPoint function as in leases/route.ts) ...
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


export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  await dbConnect();
  const { propertyId: propertyIdStr } = params;

  const numericPropertyId = Number(propertyIdStr);
  if (isNaN(numericPropertyId)) {
    return NextResponse.json({ message: 'Invalid Property ID format' }, { status: 400 });
  }

  try {
    // Optional: Check if property exists
    const propertyExists = await Property.findOne({id: numericPropertyId}).lean().exec();
    if (!propertyExists) {
        return NextResponse.json({ message: "Property not found"}, {status: 404});
    }

    // Find leases where Lease.propertyId (numeric) matches numericPropertyId
    // Your Prisma query included tenant and property for each lease.
    const rawLeases = await Lease.find({ propertyId: numericPropertyId }).lean().exec();

    const leases = await Promise.all(
        rawLeases.map(async (lease: any) => {
            let tenantData = null;
            // Assuming Lease.tenant stores Tenant's ObjectId, or Lease.tenantCognitoId stores cognitoId
            if (lease.tenant) { // If Lease.tenant stores Tenant ObjectId
                tenantData = await Tenant.findById(lease.tenant).lean().exec();
            } else if (lease.tenantCognitoId) { // Or if it stores cognitoId
                tenantData = await Tenant.findOne({ cognitoId: lease.tenantCognitoId }).lean().exec();
            }

            // The property for these leases is the one identified by numericPropertyId.
            // We already fetched it (propertyExists) or can re-fetch a minimal version if needed.
            // For simplicity, we'll attach the already known property ID, or you can attach propertyExists.
            // To match Prisma's `include: { property: true }`, we should return the property details.
            // Since all these leases are FOR this property, we can use `propertyExists`.

            let propertyDetailsWithLocation = null;
            if (propertyExists) {
                let locationData = null;
                if (propertyExists.locationId) {
                     const loc = await dbConnect().then(() => import('@/lib/models/Location')).then(mod => mod.default.findOne({ id: propertyExists.locationId as number }).lean().exec());
                    if (loc) {
                        locationData = {
                            ...loc,
                            coordinates: parseWKTPoint(loc.coordinates as string | undefined)
                        };
                    }
                }
                propertyDetailsWithLocation = { ...propertyExists, location: locationData };
            }


            return { ...lease, tenant: tenantData, property: propertyDetailsWithLocation };
        })
    );

    return NextResponse.json(leases, { status: 200 });

  } catch (error: any) {
    console.error(`Error retrieving leases for property ${numericPropertyId}:`, error);
    return NextResponse.json({ message: `Error retrieving property leases: ${error.message}` }, { status: 500 });
  }
}