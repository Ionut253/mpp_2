import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = getAuthUser();
    
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get summary data
    const [
      totalCustomers,
      totalAccounts,
      totalTransactions,
      recentTransactions,
      recentCustomers
    ] = await Promise.all([
      // Get total number of customers
      prisma.customer.count(),
      
      // Get total number of accounts
      prisma.account.count(),
      
      // Get total number of transactions
      prisma.transaction.count(),
      
      // Get 5 most recent transactions
      prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            include: {
              customer: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }),
      
      // Get 5 most recent customers
      prisma.customer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              accounts: true
            }
          }
        }
      })
    ]);

    // Get activity logs
    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalAccounts,
          totalTransactions
        },
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          date: tx.createdAt,
          customer: `${tx.account.customer.firstName} ${tx.account.customer.lastName}`,
          accountType: tx.account.accountType
        })),
        recentCustomers: recentCustomers.map(customer => ({
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          date: customer.createdAt,
          accountCount: customer._count.accounts
        })),
        recentActivity: recentActivity.map(activity => ({
          id: activity.id,
          action: activity.action,
          entity: activity.entity,
          details: activity.details,
          date: activity.timestamp,
          user: activity.user.email
        }))
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 