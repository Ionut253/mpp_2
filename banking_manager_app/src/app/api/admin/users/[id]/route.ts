import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import bcrypt from 'bcryptjs';
import { User, Transaction, Account } from '@/generated/client';

interface ExtendedUser extends User {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    dob?: Date | null;
    accounts: Array<{
      id: string;
      transactions: Array<{
        id: string;
        amount: number;
        type: string;
        status: string;
        description: string | null;
        createdAt: Date;
        accountId: string;
      }>;
    }>;
  } | null;
  activityLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: string | null;
    timestamp: Date;
  }>;
}

// Get a single user by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = params.id;
    
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            dob: true,
            accounts: {
              select: {
                id: true,
                transactions: {
                  orderBy: {
                    createdAt: 'desc'
                  },
                  take: 50,
                  select: {
                    id: true,
                    amount: true,
                    type: true,
                    description: true,
                    createdAt: true,
                    accountId: true
                  }
                }
              }
            }
          }
        },
        activityLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 50,
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            details: true,
            timestamp: true
          }
        }
      }
    }) as ExtendedUser | null;

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Flatten transactions from all accounts
    const transactions = targetUser.customer?.accounts
      ? targetUser.customer.accounts.flatMap(account => account.transactions)
      : [];

    // Sort transactions by date
    transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    await logActivity({
      userId: user.id,
      action: 'READ',
      entity: 'User',
      entityId: userId,
      details: `Admin viewed user ${targetUser.email}`
    });

    // Remove sensitive information and add flattened transactions
    const { password, ...userWithoutPassword } = targetUser;
    const userWithTransactions = {
      ...userWithoutPassword,
      transactions: transactions.slice(0, 50) // Keep only the 50 most recent transactions
    };

    return NextResponse.json({
      success: true,
      data: userWithTransactions
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

// Update a user
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = params.id;
    const data = await request.json();
    const { email, role, password } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (email) {
      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email is already taken by another user' },
          { status: 400 }
        );
      }

      updateData.email = email;
    }

    if (role) {
      updateData.role = role;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        customer: true
      }
    });

    await logActivity({
      userId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      details: `Admin updated user ${updatedUser.email}`
    });

    // Remove sensitive information
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = params.id;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Admin cannot delete themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }

    // Begin transaction to delete user and related records
    await prisma.$transaction(async (tx : any ) => {
      // Delete activity logs first (due to foreign key constraints)
      await tx.activityLog.deleteMany({
        where: { userId }
      });

      // If user has a customer profile, delete customer and related records
      if (existingUser.customer) {
        // Delete transactions for all accounts
        await tx.transaction.deleteMany({
          where: {
            account: {
              customerId: existingUser.customer.id
            }
          }
        });

        // Delete accounts
        await tx.account.deleteMany({
          where: { customerId: existingUser.customer.id }
        });

        // Delete customer
        await tx.customer.delete({
          where: { id: existingUser.customer.id }
        });
      }

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });

      // Log the action (using a different user ID since we're deleting the user)
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          entity: 'User',
          entityId: userId,
          details: `Admin deleted user ${existingUser.email}`
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 