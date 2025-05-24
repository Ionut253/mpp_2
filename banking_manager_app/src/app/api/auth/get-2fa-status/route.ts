import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorEnabled: true
      }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      twoFactorEnabled: dbUser.twoFactorEnabled
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 