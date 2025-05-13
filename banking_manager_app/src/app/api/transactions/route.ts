import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort');
    const order = (searchParams.get('order') || 'asc') as Prisma.SortOrder;
    const pageStr = searchParams.get('page') || '1';
    const pageSizeStr = searchParams.get('pageSize') || '10';
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type');
    const page: number = Math.max(1, parseInt(pageStr));
    const pageSize: number = Math.max(1, parseInt(pageSizeStr));

    // Build filter conditions
    const where: Prisma.TransactionWhereInput = {
      AND: [
        // Add accountId filter if provided
        ...(accountId ? [{ accountId }] : []),
        // Add type filter if provided
        ...(type ? [{ type }] : []),
        // Add search across relevant fields
        ...(search ? [{
          OR: [
            { type: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { account: {
              customer: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } }
                ]
              }
            }}
          ]
        }] : [])
      ]
    };

    // Build sort conditions
    let orderBy: Prisma.TransactionOrderByWithRelationInput | undefined = undefined;
    if (sort) {
      const validSortFields = ['type', 'amount', 'createdAt'] as const;
      if (validSortFields.includes(sort as typeof validSortFields[number])) {
        orderBy = { [sort]: order };
      }
    }

    // Get total count
    const totalItems = await prisma.transaction.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        account: {
          select: {
            id: true,
            accountType: true,
            balance: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const transactionData = await request.json();

    // Basic validation
    if (!transactionData.accountId || !transactionData.amount || !transactionData.type) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            accountId: !transactionData.accountId ? 'Account ID is required' : '',
            amount: !transactionData.amount ? 'Amount is required' : '',
            type: !transactionData.type ? 'Transaction type is required' : '',
          },
        },
        { status: 400 }
      );
    }

    // Validate account exists
    const account = await prisma.account.findUnique({
      where: { id: transactionData.accountId }
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Start a transaction to update both the transaction and account balance
    const result = await prisma.$transaction(async (prisma) => {
      // Create the transaction
      const newTransaction = await prisma.transaction.create({
        data: {
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          accountId: transactionData.accountId,
        }
      });

      // Update account balance based on transaction type
      const balanceChange = transactionData.type === 'WITHDRAWAL' ? -transactionData.amount : transactionData.amount;
      const updatedAccount = await prisma.account.update({
        where: { id: transactionData.accountId },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      });

      return { transaction: newTransaction, account: updatedAccount };
    });

    return NextResponse.json({ 
      success: true, 
      data: result
    });
  } catch (error) {
    console.error('Error in POST /api/transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const transactionData = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update transaction description only (amount and type should not be modified)
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        description: transactionData.description
      },
      include: {
        account: {
          select: {
            id: true,
            accountType: true,
            balance: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error in PUT /api/transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // For security and audit purposes, we don't allow deleting transactions
    return NextResponse.json(
      { success: false, error: 'Transactions cannot be deleted for audit purposes' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 