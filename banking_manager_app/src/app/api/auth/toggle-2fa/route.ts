import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { User } from '@/types/prisma';

export async function POST(request: Request) {
  try {
    const user = getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Toggle 2FA status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: !user.twoFactorEnabled
      }
    }) as User;

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
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