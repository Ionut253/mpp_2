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

    // Find the user's customer record
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

    // Get all accounts for this customer
    const accounts = await prisma.account.findMany({
      where: { customerId: dbUser.customer.id },
      orderBy: { createdAt: 'desc' }
    });

    // Log this activity
    await logActivity({
      userId: user.id,
      action: 'READ',
      entity: 'Account',
      entityId: dbUser.customer.id,
      details: 'Customer accounts viewed'
    });

    // Return the accounts
    return NextResponse.json({
      success: true,
      data: {
        accounts
      }
    });
  } catch (error) {
    console.error('Error fetching customer accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer accounts' },
      { status: 500 }
    );
  }
}

// Create a new account for the customer
export async function POST(request: Request) {
  try {
    const user = getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const data = await request.json();
    const { accountType, initialDeposit } = data;
    
    // Validate input
    if (!accountType) {
      return NextResponse.json(
        { error: 'Account type is required' },
        { status: 400 }
      );
    }

    const initialBalance = parseFloat(initialDeposit) || 0;
    if (initialBalance < 0) {
      return NextResponse.json(
        { error: 'Initial deposit cannot be negative' },
        { status: 400 }
      );
    }

    // Find the customer
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

    // Create the account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create account
      const account = await tx.account.create({
        data: {
          accountType,
          balance: initialBalance,
          customerId: dbUser.customer!.id
        }
      });

      // If there's an initial deposit, create a transaction
      if (initialBalance > 0) {
        await tx.transaction.create({
          data: {
            amount: initialBalance,
            type: 'DEPOSIT',
            accountId: account.id,
            description: 'Initial deposit'
          }
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entity: 'Account',
          entityId: account.id,
          details: `Created ${accountType} account with initial balance of $${initialBalance}`
        }
      });

      return account;
    });

    return NextResponse.json({
      success: true,
      data: {
        account: result
      }
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
} 