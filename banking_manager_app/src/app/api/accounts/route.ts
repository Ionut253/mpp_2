import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

// Define the consistent customer select object
const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true
} as const;

// Define the consistent account include object
const accountInclude = {
  customer: {
    select: customerSelect
  }
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '5');
    const search = searchParams.get('search') || '';
    const idsParam = searchParams.get('ids');
    const ids = idsParam?.split(',').filter(id => id.trim() !== '');

    console.log('Accounts API request params:', { page, pageSize, search, ids });

    // Build where clause
    let where: Prisma.AccountWhereInput = {};
    
    // If IDs are provided, override other filters and just fetch those accounts
    if (ids && ids.length > 0) {
      console.log(`Fetching specific accounts by IDs: ${ids.join(', ')}`);
      where = { id: { in: ids } };
    } else {
      // Otherwise use regular filtering
      where = {
        ...(search ? {
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
        } : {})
      };
    }

    // Get total count for pagination
    const totalItems = await prisma.account.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    // When fetching by IDs, don't apply pagination
    const skipPagination = ids && ids.length > 0;

    // Get accounts
    const accounts = await prisma.account.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            transactions: true
          }
        }
      },
      ...(skipPagination ? {} : {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${accounts.length} accounts`);

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
      { success: false, error: 'Failed to fetch accounts' },
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

    // Validate customer exists and get full customer data
    const customer = await prisma.customer.findUnique({
      where: { id: accountData.customerId },
      select: customerSelect
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create account with customer information
    const newAccount = await prisma.account.create({
      data: {
        accountType: accountData.accountType,
        balance: accountData.balance || 0,
        customerId: accountData.customerId,
      },
      include: accountInclude
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

    // Check if account exists with customer information
    const existingAccount = await prisma.account.findUnique({
      where: { id },
      include: accountInclude
    });

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Update account with customer information
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        accountType: accountData.accountType,
        balance: accountData.balance,
      },
      include: accountInclude
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
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check if account exists and has transactions, include customer info
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        ...accountInclude,
        transactions: true
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.transactions.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: 'Cannot delete account with existing transactions',
          details: {
            transactionCount: account.transactions.length,
            customer: account.customer
          }
        },
        { status: 400 }
      );
    }

    // If force is true or no transactions exist, delete the account and its transactions
    await prisma.$transaction(async (tx) => {
      // Delete all transactions first if they exist
      if (account.transactions.length > 0) {
        await tx.transaction.deleteMany({
          where: { accountId: id }
        });
      }

      // Then delete the account
      await tx.account.delete({
        where: { id }
      });
    });

    return NextResponse.json({ 
      success: true,
      data: {
        deletedAccount: {
          id,
          customer: account.customer
        }
    }});
  } catch (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
} 