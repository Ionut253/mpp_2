import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: Request) {
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

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const accountId = url.searchParams.get('accountId');
    
    // Validate parameters
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100
    const validatedPage = Math.max(1, page);
    const skip = (validatedPage - 1) * validatedLimit;
    
    // Get the customer's accounts
    const accounts = await prisma.account.findMany({
      where: { customerId: dbUser.customer.id },
      select: { id: true }
    });
    
    const accountIds = accounts.map(acc => acc.id);
    
    if (accountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          transactions: [],
          pagination: {
            total: 0,
            page: validatedPage,
            pageSize: validatedLimit,
            totalPages: 0
          }
        }
      });
    }
    
    // Apply filtering
    const where = accountId 
      ? { accountId } 
      : { accountId: { in: accountIds } };
    
    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: validatedLimit,
      skip,
      include: {
        account: {
          select: {
            accountType: true
          }
        }
      }
    });

    // Log this activity
    await logActivity({
      userId: user.id,
      action: 'READ',
      entity: 'Transaction',
      entityId: dbUser.customer.id, // Using customer ID as the entity ID
      details: `Customer transactions viewed (${transactions.length} transactions)`
    });

    // Return the transactions with pagination
    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: totalCount,
          page: validatedPage,
          pageSize: validatedLimit,
          totalPages: Math.ceil(totalCount / validatedLimit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer transactions' },
      { status: 500 }
    );
  }
}

// Create a new transaction
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
    const { accountId, type, amount, description } = data;
    
    // Validate input
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }
    
    if (!type || !['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid transaction type is required (DEPOSIT, WITHDRAWAL, or TRANSFER)' },
        { status: 400 }
      );
    }
    
    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { error: 'Transaction amount must be a positive number' },
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
    
    // Check if the account belongs to this customer
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        customerId: dbUser.customer.id
      }
    });
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to this customer' },
        { status: 404 }
      );
    }
    
    // For withdrawals, ensure there are sufficient funds
    if (type === 'WITHDRAWAL' && account.balance < transactionAmount) {
      return NextResponse.json(
        { error: 'Insufficient funds for this withdrawal' },
        { status: 400 }
      );
    }
    
    // Create the transaction and update account balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update account balance
      const updatedBalance = type === 'DEPOSIT' 
        ? account.balance + transactionAmount 
        : account.balance - transactionAmount;
        
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: { balance: updatedBalance }
      });
      
      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          amount: transactionAmount,
          type,
          accountId,
          description: description || `${type} transaction`
        }
      });
      
      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entity: 'Transaction',
          entityId: transaction.id,
          details: `Created ${type} transaction of $${transactionAmount} for account ${account.accountType}`
        }
      });
      
      return { transaction, account: updatedAccount };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        transaction: result.transaction,
        account: {
          id: result.account.id,
          balance: result.account.balance,
          accountType: result.account.accountType
        }
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
} 