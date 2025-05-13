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
    const customerId = searchParams.get('customerId');
    const accountType = searchParams.get('accountType');
    const page: number = Math.max(1, parseInt(pageStr));
    const pageSize: number = Math.max(1, parseInt(pageSizeStr));

    // Build filter conditions
    const where: Prisma.AccountWhereInput = {
      AND: [
        // Add customerId filter if provided
        ...(customerId ? [{ customerId }] : []),
        // Add accountType filter if provided
        ...(accountType ? [{ accountType }] : []),
        // Add search across relevant fields
        ...(search ? [{
          OR: [
            { accountType: { contains: search, mode: 'insensitive' } },
            { customer: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }}
          ]
        }] : [])
      ]
    };

    // Build sort conditions
    let orderBy: Prisma.AccountOrderByWithRelationInput | undefined = undefined;
    if (sort) {
      const validSortFields = ['accountType', 'balance', 'createdAt', 'updatedAt'] as const;
      if (validSortFields.includes(sort as typeof validSortFields[number])) {
        orderBy = { [sort]: order };
      }
    }

    // Get total count
    const totalItems = await prisma.account.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated accounts
    const accounts = await prisma.account.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Get only the 5 most recent transactions
        },
        _count: {
          select: { transactions: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        pagination: {
          currentPage: page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const accountData = await request.json();

    // Basic validation
    if (!accountData.customerId || !accountData.accountType) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            customerId: !accountData.customerId ? 'Customer ID is required' : '',
            accountType: !accountData.accountType ? 'Account type is required' : '',
          },
        },
        { status: 400 }
      );
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: accountData.customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create account
    const newAccount = await prisma.account.create({
      data: {
        accountType: accountData.accountType,
        balance: accountData.balance || 0,
        customerId: accountData.customerId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: newAccount
    });
  } catch (error) {
    console.error('Error in POST /api/accounts:', error);
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
    const accountData = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
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
        balance: accountData.balance,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
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
    console.error('Error in PUT /api/accounts:', error);
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
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check if account exists and has no transactions
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account._count.transactions > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete account with existing transactions' },
        { status: 400 }
      );
    }

    await prisma.account.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true 
    });
  } catch (error) {
    console.error('Error in DELETE /api/accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 