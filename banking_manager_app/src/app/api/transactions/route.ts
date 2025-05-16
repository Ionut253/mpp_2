import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    console.log('Transactions API request params:', { page, pageSize, search });

    const where: Prisma.TransactionWhereInput = search
      ? {
          OR: [
            { type: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { account: {
                OR: [
                  { accountType: { contains: search, mode: Prisma.QueryMode.insensitive } },
                  { customer: {
                      OR: [
                        { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                        { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        }
      : {};

    const totalItems = await prisma.transaction.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            _count: {
              select: {
                transactions: true
              }
            }
          }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${transactions.length} transactions`);

    const accountIds = transactions.map(t => t.accountId);
    console.log('Transaction account IDs:', accountIds);

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
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const transactionData = await request.json();

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

    const account = await prisma.account.findUnique({
      where: { id: transactionData.accountId },
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

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      const newTransaction = await prisma.transaction.create({
        data: {
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          accountId: transactionData.accountId,
        },
        include: {
          account: {
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
          }
        }
      });

      const balanceChange = transactionData.type === 'WITHDRAWAL' ? -transactionData.amount : transactionData.amount;
      const updatedAccount = await prisma.account.update({
        where: { id: transactionData.accountId },
        data: {
          balance: {
            increment: balanceChange
          }
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

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: {
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
        }
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        description: transactionData.description
      },
      include: {
        account: {
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
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: transaction.type === 'WITHDRAWAL' ? transaction.amount : -transaction.amount,
          },
        },
      });

      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 