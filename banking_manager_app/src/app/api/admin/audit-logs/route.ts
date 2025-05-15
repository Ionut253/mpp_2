import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: Request) {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const entity = url.searchParams.get('entity');
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Validate and normalize pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 100); // Between 1 and 100
    const skip = (validPage - 1) * validPageSize;

    // Build the where clause based on filters
    const where: any = {};

    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    
    // Date range filter
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) {
        // Set to end of day for the 'to' date
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = toDate;
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.activityLog.count({ where });

    // Get the audit logs with pagination and filters
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: validPageSize
    });

    // Log this activity
    await logActivity({
      userId: user.id,
      action: 'READ',
      entity: 'ActivityLog',
      entityId: 'all',
      details: `Admin viewed audit logs (page ${validPage}, ${logs.length} logs)`
    });

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          page: validPage,
          pageSize: validPageSize,
          totalPages: Math.ceil(totalCount / validPageSize)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
} 