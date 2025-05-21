import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@/generated/client/runtime/library';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Get the transaction and its account
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

    // Start a transaction to update account balance and delete transaction
    await prisma.$transaction(async (tx) => {
      // Update account balance
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            // Reverse the transaction amount
            increment: transaction.type === 'WITHDRAWAL' ? transaction.amount : -transaction.amount,
          },
        },
      });

      // Delete the transaction
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const transactionData = await request.json();

    // Validation errors object
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!transactionData.type) {
      errors.type = 'Transaction type is required';
    }
    if (typeof transactionData.amount !== 'number' || transactionData.amount <= 0) {
      errors.amount = 'Amount must be a positive number';
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Get the current transaction and its account
    const currentTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true
      }
    });

    if (!currentTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Calculate the balance adjustment
    const oldBalanceEffect = currentTransaction.type === 'WITHDRAWAL' ? -currentTransaction.amount : currentTransaction.amount;
    const newBalanceEffect = transactionData.type === 'WITHDRAWAL' ? -transactionData.amount : transactionData.amount;
    const balanceAdjustment = newBalanceEffect - oldBalanceEffect;

    // Update transaction and account balance in a transaction
    const result = await prisma.$transaction(async (tx : any) => {
      // Update the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description || null
        },
        include: {
          account: true
        }
      });

      // Update the account balance
      const updatedAccount = await tx.account.update({
        where: { id: currentTransaction.accountId },
        data: {
          balance: {
            increment: balanceAdjustment
          }
        }
      });

      return { transaction: updatedTransaction, account: updatedAccount };
    });

    return NextResponse.json({ 
      success: true,
      data: result.transaction,
      account: result.account
    });
  } catch (error) {
    console.error('Error in PUT /api/transactions/[id]:', error);
    
    // Check for specific Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
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