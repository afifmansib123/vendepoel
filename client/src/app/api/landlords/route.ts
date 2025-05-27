import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Landlord from '@/lib/models/Landlord'; 
import mongoose from 'mongoose';

interface LandlordData {
  _id: mongoose.ObjectId // Optional if your schema does not require it
  id?: number; // Optional if your schema does not require it
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber?: string; // Optional field
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { cognitoId, name, email, phoneNumber } = body;

    if (!cognitoId || !name || !email) {
      return NextResponse.json({ message: 'Missing required fields: cognitoId, name, email, phoneNumber' }, { status: 400 });
    }

    const existingLandlord = await Landlord.findOne({ cognitoId }).lean().exec();
    if (existingLandlord) {
        return NextResponse.json({ message: 'Landlord with this Cognito ID already exists' }, { status: 409 });
    }

    // Manage numeric 'id' if your "adjusted" schema requires it
    const lastLandlord = await Landlord.findOne().sort({ id: -1 }).select('id').lean() as LandlordData | null;
    const nextLandlordrId = (lastLandlord && typeof lastLandlord.id === 'number' ? lastLandlord.id : 0) + 1;

    const newLandlord = new Landlord({
      id: nextLandlordrId, // If your schema has numeric id
      cognitoId,
      name,
      email,
      phoneNumber,
    });

    const savedLandlord = await newLandlord.save();

    return NextResponse.json(savedLandlord.toObject(), { status: 201 });

  } catch (error: any) {
    console.error('Error creating landlord:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
        return NextResponse.json({ message: 'Duplicate key error. A landlord with this identifier might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ message: `Error creating landlord: ${error.message}` }, { status: 500 });
  }
}