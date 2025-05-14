import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Helper function to check if error is a Prisma unique constraint violation
const isUniqueConstraintError = (error: unknown): error is PrismaClientKnownRequestError => {
  return (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    error.meta?.target !== undefined
  );
};

// Helper function to validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    // Build where clause for search
    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    // Get total count for pagination
    const totalItems = await prisma.customer.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated customers with their accounts
    const customers = await prisma.customer.findMany({
      where,
      include: {
        accounts: {
          orderBy: {
            createdAt: 'desc'
          }
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          currentPage: page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/customers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const customerData = await request.json();

    // Validation errors object
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!customerData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!customerData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!customerData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(customerData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!customerData.dob) {
      errors.dob = 'Date of birth is required';
    } else {
      const dobDate = new Date(customerData.dob);
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear();
      if (age < 18) {
        errors.dob = 'Customer must be at least 18 years old';
      }
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: customerData.email.trim() }
    });

    if (existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            email: 'A customer with this email already exists'
          }
        },
        { status: 400 }
      );
    }

    // Create customer
    const newCustomer = await prisma.customer.create({
      data: {
        firstName: customerData.firstName.trim(),
        lastName: customerData.lastName.trim(),
        email: customerData.email.trim(),
        phone: customerData.phone?.trim() || null,
        address: customerData.address?.trim() || null,
        dob: customerData.dob ? new Date(customerData.dob) : null,
      },
      include: {
        accounts: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: newCustomer
    });
  } catch (error) {
    console.error('Error in POST /api/customers:', error);
    
    // Handle unique constraint violation (as a fallback)
    if (isUniqueConstraintError(error)) {
      const target = error.meta?.target as string[];
      return NextResponse.json(
        {
          success: false,
          errors: {
            [target[0]]: `A customer with this ${target[0]} already exists`
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, errors: { create: 'Failed to create customer' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const customerData = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Validation errors object
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!customerData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!customerData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!customerData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(customerData.email)) {
      errors.email = 'Invalid email format';
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        firstName: customerData.firstName.trim(),
        lastName: customerData.lastName.trim(),
        email: customerData.email.trim(),
        phone: customerData.phone?.trim() || null,
        address: customerData.address?.trim() || null,
        dob: customerData.dob ? new Date(customerData.dob) : null,
      },
      include: {
        accounts: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: customer
    });
  } catch (error) {
    console.error('Error in PUT /api/customers:', error);

    // Handle unique constraint violation
    if (isUniqueConstraintError(error)) {
      const target = error.meta?.target as string[];
      return NextResponse.json(
        {
          success: false,
          errors: {
            [target[0]]: `A customer with this ${target[0]} already exists`
          }
        },
        { status: 400 }
      );
    }

    // Handle case where customer is not found
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

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
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists and get their accounts
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        accounts: {
          include: {
            transactions: true
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if any accounts have transactions
    const accountsWithTransactions = customer.accounts.filter(account => account.transactions.length > 0);
    if (accountsWithTransactions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete customer with active accounts. Please delete all transactions and accounts first.',
          details: {
            accountsWithTransactions: accountsWithTransactions.map(account => ({
              id: account.id,
              type: account.accountType,
              transactionCount: account.transactions.length
            }))
          }
        },
        { status: 400 }
      );
    }

    // If we get here, we can safely delete the customer's accounts (which have no transactions)
    await prisma.$transaction(async (tx) => {
      // Delete all accounts first
      await tx.account.deleteMany({
        where: { customerId: id }
      });

      // Then delete the customer
      await tx.customer.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
} 