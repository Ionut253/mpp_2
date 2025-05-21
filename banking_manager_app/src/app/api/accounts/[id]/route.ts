import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const accountData = await request.json();

    // Validation errors object
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!accountData.accountType) {
      errors.accountType = 'Account type is required';
    }
    if (typeof accountData.balance !== 'number') {
      errors.balance = 'Balance must be a number';
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id }
    });

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Update account
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        accountType: accountData.accountType,
        balance: accountData.balance
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    console.error('Error in PUT /api/accounts/[id]:', error);
    
    // Check for specific Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Account not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}