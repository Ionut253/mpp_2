import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

// Get all monitored users
export async function GET() {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const monitoredUsers = await prisma.monitoredUser.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    await logActivity({
      userId: user.id,
      action: 'READ',
      entity: 'MonitoredUser',
      entityId: 'all',
      details: 'Admin viewed all monitored users'
    });

    return NextResponse.json({
      success: true,
      data: monitoredUsers
    });
  } catch (error) {
    console.error('Error fetching monitored users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitored users' },
      { status: 500 }
    );
  }
}

// Add a user to monitoring
export async function POST(request: Request) {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { userId, reason } = data;

    // Validate input
    if (!userId || !reason) {
      return NextResponse.json(
        { error: 'User ID and reason are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already being monitored
    const existingMonitoring = await prisma.monitoredUser.findFirst({
      where: {
        userId,
        isActive: true
      }
    });

    if (existingMonitoring) {
      return NextResponse.json(
        { error: 'User is already being monitored' },
        { status: 400 }
      );
    }

    // Create monitoring record
    const monitoredUser = await prisma.monitoredUser.create({
      data: {
        userId,
        reason,
        isActive: true,
        addedById: user.id
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    await logActivity({
      userId: user.id,
      action: 'CREATE',
      entity: 'MonitoredUser',
      entityId: monitoredUser.id,
      details: `Admin added user ${targetUser.email} to monitoring: ${reason}`
    });

    return NextResponse.json({
      success: true,
      data: monitoredUser
    });
  } catch (error) {
    console.error('Error adding monitored user:', error);
    return NextResponse.json(
      { error: 'Failed to add user to monitoring' },
      { status: 500 }
    );
  }
} 