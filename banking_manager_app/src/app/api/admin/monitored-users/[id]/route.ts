import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

// Update monitored user status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const monitoredUserId = params.id;
    const data = await request.json();
    const { isActive } = data;

    // Validate input
    if (isActive === undefined) {
      return NextResponse.json(
        { error: 'Active status is required' },
        { status: 400 }
      );
    }

    // Check if monitored user record exists
    const existingRecord = await prisma.monitoredUser.findUnique({
      where: { id: monitoredUserId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Monitored user record not found' },
        { status: 404 }
      );
    }

    // Update monitored user status
    const updatedRecord = await prisma.monitoredUser.update({
      where: { id: monitoredUserId },
      data: { isActive },
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
      action: 'UPDATE',
      entity: 'MonitoredUser',
      entityId: monitoredUserId,
      details: `Admin ${isActive ? 'activated' : 'deactivated'} monitoring for user ${existingRecord.user.email}`
    });

    return NextResponse.json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error updating monitored user:', error);
    return NextResponse.json(
      { error: 'Failed to update monitored user' },
      { status: 500 }
    );
  }
} 