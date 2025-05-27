// src/app/api/buyers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Buyer from '@/lib/models/Buyer'; // Your Mongoose buyer model

interface buyerIdResult {
  id: number;
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { cognitoId, name, email, phoneNumber } = body;

    // Basic validation
    if (!cognitoId || !name || !email) {
      return NextResponse.json({ message: 'Missing required fields: cognitoId, name, email, phoneNumber' }, { status: 400 });
    }

    // Check if buyer with this cognitoId already exists
    const existingbuyer = await Buyer.findOne({ cognitoId }).lean().exec();
    if (existingbuyer) {
        return NextResponse.json({ message: 'buyer with this Cognito ID already exists' }, { status: 409 }); // Conflict
    }

    // Create new buyer (manage numeric ID if your "adjusted" schema requires it and it's not auto-managed)
    // For simplicity, assuming numeric 'id' is handled or not strictly sequential for new creates via API
    // If 'id' is required and numeric, you'd need a sequence generator
    const lastbuyer = await Buyer.findOne().sort({ id: -1 }).select('id').lean() as buyerIdResult | null;
    const nextbuyerId = (lastbuyer && typeof lastbuyer.id === 'number' ? lastbuyer.id : 0) + 1;


    const newbuyer = new Buyer({
      id: nextbuyerId, // If your schema has numeric id
      cognitoId,
      name,
      email,
      phoneNumber,
      // favorites and properties will default to empty arrays as per schema
    });

    const savedbuyer = await newbuyer.save();

    return NextResponse.json(savedbuyer.toObject(), { status: 201 });

  } catch (error: any) {
    console.error('Error creating buyer:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) { // Duplicate key error (e.g. if cognitoId somehow wasn't caught above)
        return NextResponse.json({ message: 'Duplicate key error. A buyer with this identifier might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ message: `Error creating buyer: ${error.message}` }, { status: 500 });
  }
}