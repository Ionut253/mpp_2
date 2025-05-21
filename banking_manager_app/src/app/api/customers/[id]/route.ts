import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@/generated/client/runtime/library';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const customerData = await request.json();

    const errors: Record<string, string> = {};

    if (!customerData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!customerData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!customerData.email?.trim()) {
      errors.email = 'Email is required';
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

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customerData.email !== existingCustomer.email) {
      const emailExists = await prisma.customer.findUnique({
        where: { email: customerData.email.trim() }
      });

      if (emailExists) {
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
    }

    const updatedCustomer = await prisma.customer.update({
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
        accounts: {
          include: {
            transactions: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Error in PUT /api/customers/[id]:', error);
    
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('Starting deletion process for customer:', id);

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
      console.log('Customer not found:', id);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('Found customer with:', {
      accountCount: customer.accounts.length,
      transactionCounts: customer.accounts.map(a => ({
        accountId: a.id,
        transactionCount: a.transactions.length
      }))
    });

    const result = await prisma.$transaction(async (tx : any) => {
      let deletedTransactions = 0;
      
      for (const account of customer.accounts) {
        console.log(`Deleting transactions for account ${account.id}...`);
        const { count } = await tx.transaction.deleteMany({
          where: { accountId: account.id }
        });
        deletedTransactions += count;
        console.log(`Deleted ${count} transactions from account ${account.id}`);
      }

      console.log('Deleting accounts...');
      const { count: deletedAccounts } = await tx.account.deleteMany({
        where: { customerId: id }
      });
      console.log(`Deleted ${deletedAccounts} accounts`);

      console.log('Deleting customer...');
      const deletedCustomer = await tx.customer.delete({
        where: { id }
      });
      console.log('Customer deleted successfully');

      return {
        customer: deletedCustomer,
        deletedAccounts,
        deletedTransactions
      };
    });

    console.log('Deletion completed successfully:', result);

    return NextResponse.json({ 
      success: true,
      data: {
        customer,
        deletedCounts: {
          accounts: result.deletedAccounts,
          transactions: result.deletedTransactions
        }
      }
    });
  } catch (error) {
    console.error('Error in DELETE /api/customers/[id]:', error);
    
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 