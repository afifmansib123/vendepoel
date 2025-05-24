// src/app/api/managers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Manager from '@/lib/models/Manager'; // Your Mongoose Manager model

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { cognitoId, name, email, phoneNumber } = body;

    if (!cognitoId || !name || !email || !phoneNumber) {
      return NextResponse.json({ message: 'Missing required fields: cognitoId, name, email, phoneNumber' }, { status: 400 });
    }

    const existingManager = await Manager.findOne({ cognitoId }).lean().exec();
    if (existingManager) {
        return NextResponse.json({ message: 'Manager with this Cognito ID already exists' }, { status: 409 });
    }

    // Manage numeric 'id' if your "adjusted" schema requires it
    const lastManager = await Manager.findOne().sort({ id: -1 }).select('id').lean();
    const nextManagerId = (lastManager && typeof lastManager.id === 'number' ? lastManager.id : 0) + 1;

    const newManager = new Manager({
      id: nextManagerId, // If your schema has numeric id
      cognitoId,
      name,
      email,
      phoneNumber,
    });

    const savedManager = await newManager.save();

    return NextResponse.json(savedManager.toObject(), { status: 201 });

  } catch (error: any) {
    console.error('Error creating manager:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
        return NextResponse.json({ message: 'Duplicate key error. A manager with this identifier might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ message: `Error creating manager: ${error.message}` }, { status: 500 });
  }
}