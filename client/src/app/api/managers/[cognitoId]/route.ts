// src/app/api/managers/[cognitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Manager from '@/lib/models/Manager'; // Your Mongoose Manager model

// --- GET Handler (Get Manager by Cognito ID) ---
export async function GET(
  request: NextRequest,
  { params }: { params: { cognitoId: string } }
) {
  await dbConnect();
  const { cognitoId } = params;

  if (!cognitoId) {
    return NextResponse.json({ message: 'Cognito ID is required in path' }, { status: 400 });
  }

  try {
    const manager = await Manager.findOne({ cognitoId }).lean().exec();

    if (!manager) {
      return NextResponse.json({ message: 'Manager not found' }, { status: 404 });
    }

    return NextResponse.json(manager, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching manager ${cognitoId}:`, error);
    return NextResponse.json({ message: `Error retrieving manager: ${error.message}` }, { status: 500 });
  }
}

// --- PUT Handler (Update Manager by Cognito ID) ---
export async function PUT(
  request: NextRequest,
  { params }: { params: { cognitoId: string } }
) {
  await dbConnect();
  const { cognitoId } = params;

  if (!cognitoId) {
    return NextResponse.json({ message: 'Cognito ID is required in path' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, email, phoneNumber } = body; // Only pick allowed fields

    const updateData: { name?: string; email?: string; phoneNumber?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedManager = await Manager.findOneAndUpdate(
      { cognitoId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updatedManager) {
      return NextResponse.json({ message: 'Manager not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json(updatedManager, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating manager ${cognitoId}:`, error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating manager: ${error.message}` }, { status: 500 });
  }
}