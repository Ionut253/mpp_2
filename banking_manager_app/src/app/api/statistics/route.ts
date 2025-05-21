import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * GET /api/statistics
 * 
 * Returns various statistical data points about accounts and transactions
 * Optimized for large datasets with complex aggregations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'all';
    const accountType = searchParams.get('accountType') || null;
    
    console.log('Statistics API request params:', { timeframe, accountType });

    const startDate = getStartDateForTimeframe(timeframe);
    
    // Build where clauses for filtering
    const accountWhere: {} = accountType 
      ? { accountType } 
      : {};

    const transactionWhere: {} = startDate
      ? {
          createdAt: { gte: startDate },
          account: accountWhere
        } 
      : {
          account: accountWhere
        };

    // Use Promise.all to run queries in parallel
    const [
      totalAccounts,
      totalTransactions,
      accountTypeDistribution,
      transactionTypeDistribution,
      transactionVolume,
      customerBalanceSummary,
      recentActivityTrends
    ] = await Promise.all([
      // Basic count stats
      prisma.account.count({ where: accountWhere }),
      prisma.transaction.count({ where: transactionWhere }),
      
      // Account type distribution with avg balance - using groupBy
      prisma.$queryRaw<{ accountType: string, count: bigint, avgBalance: number }[]>`
        SELECT "accountType", COUNT(*) as count, AVG("balance") as "avgBalance"
        FROM "Account"
        ${accountType ? Prisma.sql`WHERE "accountType" = ${accountType}` : Prisma.empty}
        GROUP BY "accountType"
        ORDER BY count DESC
      `,
      
      // Transaction type distribution - using groupBy
      prisma.$queryRaw<{ type: string, count: bigint, totalAmount: number }[]>`
        SELECT t.type, COUNT(*) as count, SUM(t.amount) as "totalAmount"
        FROM "Transaction" t
        JOIN "Account" a ON t."accountId" = a.id
        WHERE 1=1
        ${startDate ? Prisma.sql`AND t."createdAt" >= ${startDate}` : Prisma.empty}
        ${accountType ? Prisma.sql`AND a."accountType" = ${accountType}` : Prisma.empty}
        GROUP BY t.type
        ORDER BY count DESC
      `,
      
      // Transaction volume over time - daily aggregation
      prisma.$queryRaw<{ date: string, count: bigint, totalAmount: number }[]>`
        SELECT 
          DATE_TRUNC('day', t."createdAt") as date,
          COUNT(*) as count,
          SUM(t.amount) as "totalAmount"
        FROM "Transaction" t
        JOIN "Account" a ON t."accountId" = a.id
        WHERE 1=1
        ${startDate ? Prisma.sql`AND t."createdAt" >= ${startDate}` : Prisma.empty}
        ${accountType ? Prisma.sql`AND a."accountType" = ${accountType}` : Prisma.empty}
        GROUP BY DATE_TRUNC('day', t."createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // Top customers by total balance
      prisma.$queryRaw<{ customerId: string, customerName: string, totalBalance: number, accountCount: bigint }[]>`
        SELECT 
          c.id as "customerId",
          CONCAT(c."firstName", ' ', c."lastName") as "customerName",
          SUM(a.balance) as "totalBalance",
          COUNT(a.id) as "accountCount"
        FROM "Customer" c
        JOIN "Account" a ON c.id = a."customerId"
        ${accountType ? Prisma.sql`WHERE a."accountType" = ${accountType}` : Prisma.empty}
        GROUP BY c.id, c."firstName", c."lastName"
        ORDER BY "totalBalance" DESC
        LIMIT 10
      `,
      
      // Recent activity trends by hour (last 24 hours)
      timeframe === '24h' || timeframe === '7d' ? 
        prisma.$queryRaw<{ hour: string, count: bigint, totalAmount: number }[]>`
          SELECT 
            TO_CHAR(t."createdAt", 'HH24') as hour,
            COUNT(*) as count,
            SUM(t.amount) as "totalAmount"
          FROM "Transaction" t
          JOIN "Account" a ON t."accountId" = a.id
          WHERE t."createdAt" >= NOW() - INTERVAL '24 HOURS'
          ${accountType ? Prisma.sql`AND a."accountType" = ${accountType}` : Prisma.empty}
          GROUP BY TO_CHAR(t."createdAt", 'HH24')
          ORDER BY hour
        ` : null
    ]);

    return NextResponse.json({
      success: true,
      data: {
        meta: {
          timeframe,
          accountType: accountType || 'all',
        },
        stats: {
          totalAccounts,
          totalTransactions,
          accountTypeDistribution,
          transactionTypeDistribution,
          transactionVolume,
          customerBalanceSummary,
          recentActivityTrends: recentActivityTrends || []
        }
      },
    });
  } catch (error) {
    console.error('Error in GET /api/statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

// Helper function to get start date based on timeframe parameter
function getStartDateForTimeframe(timeframe: string): Date | null {
  const now = new Date();
  
  switch (timeframe) {
    case '24h':
      now.setHours(now.getHours() - 24);
      return now;
    case '7d':
      now.setDate(now.getDate() - 7);
      return now;
    case '30d':
      now.setDate(now.getDate() - 30);
      return now;
    case '90d':
      now.setDate(now.getDate() - 90);
      return now;
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      return now;
    case 'all':
    default:
      return null;
  }
} 