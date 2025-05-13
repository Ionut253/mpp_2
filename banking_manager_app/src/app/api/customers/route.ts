import { NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Sample data generation
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Emily', 'William', 'Olivia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];

// Pre-generate dates for better performance
const generateRandomDate = () => {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 80); // 80 years ago
  const end = new Date();
  end.setFullYear(end.getFullYear() - 18); // 18 years ago
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
};

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  address: string;
  phoneNumber: string;
  balance: number;
}

function generateRandomCustomer(id: string): CustomerData {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const address = `${Math.floor(Math.random() * 1000) + 1} ${cities[Math.floor(Math.random() * cities.length)]}`;
  const phoneNumber = `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  const balance = parseFloat((Math.random() * 10000).toFixed(2));
  const dob = generateRandomDate();

  return {
    id,
    firstName,
    lastName,
    dob,
    address,
    phoneNumber,
    balance
  };
}

// In-memory storage for demo purposes
// In a real app, this would be a database
export let customers: CustomerData[] = Array.from({ length: 40 }, (_, i) => generateRandomCustomer(`${i + 1}`));

// Cached search results
const searchCache = new Map<string, CustomerData[]>();
const CACHE_TIMEOUT = 5000; // 5 seconds

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
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort');
    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
    const pageStr = searchParams.get('page') || '1';
    const pageSizeStr = searchParams.get('pageSize') || '10';
    const page: number = Math.max(1, parseInt(pageStr));
    const pageSize: number = Math.max(1, parseInt(pageSizeStr));

    // Build filter conditions
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    // Build sort conditions
    let orderBy: { [key: string]: 'asc' | 'desc' } | undefined = undefined;
    if (sort && sort !== 'null') {
      // Only add sorting if a valid field is provided
      const validSortFields = ['name', 'email', 'phone', 'createdAt', 'updatedAt'] as const;
      if (validSortFields.includes(sort as typeof validSortFields[number])) {
        orderBy = { [sort]: order };
      }
    }

    // Get total count
    const totalItems = await prisma.customer.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated customers with their accounts and transactions
    const customers = await prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        accounts: {
          include: {
            transactions: true
          }
        }
      }
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
      { success: false, error: 'Internal server error' },
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
    if (!customerData.name?.trim()) {
      errors.name = 'Name is required';
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
        name: customerData.name.trim(),
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
    if (!customerData.name?.trim()) {
      errors.name = 'Name is required';
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
        name: customerData.name.trim(),
        email: customerData.email.trim(),
        phone: customerData.phone?.trim() || null,
        address: customerData.address?.trim() || null,
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
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // First, check if the customer exists
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
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Delete all transactions first
    if (customer.accounts.length > 0) {
      const accountIds = customer.accounts.map((account: { id: string }) => account.id);
      await prisma.transaction.deleteMany({
        where: {
          accountId: {
            in: accountIds
          }
        }
      });

      // Then delete all accounts
      await prisma.account.deleteMany({
        where: {
          id: {
            in: accountIds
          }
        }
      });
    }

    // Finally, delete the customer
    await prisma.customer.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true 
    });
  } catch (error) {
    console.error('Error in DELETE /api/customers:', error);

    // Handle foreign key constraint violation
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete customer with existing accounts' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 