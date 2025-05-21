import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    const user = getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { customer: true }
    });

    if (!dbUser || !dbUser.customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = dbUser.customer;

    // Log this activity
    await logActivity({
      userId: user.id,
      action: 'READ',
      entity: 'Customer',
      entityId: customer.id,
      details: 'Customer profile viewed'
    });

    // Return the customer data
    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          dob: customer.dob
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { customer: true }
    });

    if (!dbUser || !dbUser.customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const data = await request.json();
    const { firstName, lastName, email, phone, address, dob } = data;
    
    // Update customer in a transaction
    const result = await prisma.$transaction(async (tx : any) => {
      // Update email in User model if it has changed
      if (email && email !== dbUser.email) {
        // Check if email is already taken by another user
        const existingUser = await tx.user.findUnique({
          where: { email }
        });
        
        if (existingUser && existingUser.id !== user.id) {
          throw new Error('Email is already in use by another user');
        }
        
        await tx.user.update({
          where: { id: user.id },
          data: { email }
        });
      }
      
      // Update customer profile
      const updatedCustomer = await tx.customer.update({
        where: { id: dbUser.customer!.id },
        data: {
          firstName: firstName || dbUser.customer!.firstName,
          lastName: lastName || dbUser.customer!.lastName,
          email: email || dbUser.customer!.email,
          phone,
          address,
          dob: dob ? new Date(dob) : dbUser.customer!.dob
        }
      });
      
      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          entity: 'Customer',
          entityId: updatedCustomer.id,
          details: 'Customer profile updated'
        }
      });
      
      return updatedCustomer;
    });

    // Return the updated customer data
    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          email: result.email,
          phone: result.phone,
          address: result.address,
          dob: result.dob
        }
      }
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    
    // More descriptive error messages
    if (error instanceof Error) {
      if (error.message.includes('already in use')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update customer profile' },
      { status: 500 }
    );
  }
} 