import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { User } from '@/types/prisma';

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current user state from database
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        twoFactorEnabled: true
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Toggle 2FA status using the current database state
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        twoFactorEnabled: !currentUser.twoFactorEnabled
      }
    }) as User;

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: authUser.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: authUser.id,
        details: `User ${updatedUser.twoFactorEnabled ? 'enabled' : 'disabled'} 2FA`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        twoFactorEnabled: updatedUser.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Toggle 2FA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 