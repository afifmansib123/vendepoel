// src/app/api/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/lib/models/Tenant'; // Your Mongoose Tenant model

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { cognitoId, name, email, phoneNumber } = body;

    // Basic validation
    if (!cognitoId || !name || !email) {
      return NextResponse.json({ message: 'Missing required fields: cognitoId, name, email, phoneNumber' }, { status: 400 });
    }

    // Check if tenant with this cognitoId already exists
    const existingTenant = await Tenant.findOne({ cognitoId }).lean().exec();
    if (existingTenant) {
        return NextResponse.json({ message: 'Tenant with this Cognito ID already exists' }, { status: 409 }); // Conflict
    }

    // Create new tenant (manage numeric ID if your "adjusted" schema requires it and it's not auto-managed)
    // For simplicity, assuming numeric 'id' is handled or not strictly sequential for new creates via API
    // If 'id' is required and numeric, you'd need a sequence generator
    const lastTenant = await Tenant.findOne().sort({ id: -1 }).select('id').lean();
    const nextTenantId = (lastTenant && typeof lastTenant.id === 'number' ? lastTenant.id : 0) + 1;


    const newTenant = new Tenant({
      id: nextTenantId, // If your schema has numeric id
      cognitoId,
      name,
      email,
      phoneNumber,
      // favorites and properties will default to empty arrays as per schema
    });

    const savedTenant = await newTenant.save();

    return NextResponse.json(savedTenant.toObject(), { status: 201 });

  } catch (error: any) {
    console.error('Error creating tenant:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) { // Duplicate key error (e.g. if cognitoId somehow wasn't caught above)
        return NextResponse.json({ message: 'Duplicate key error. A tenant with this identifier might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ message: `Error creating tenant: ${error.message}` }, { status: 500 });
  }
}