import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { User } from '@/types/prisma';

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    }) as (User & { customer: { id: string; firstName: string; lastName: string; } | null });

    if (!user || !user.verificationCode || !user.verificationExpiry) {
      return NextResponse.json(
        { error: 'Invalid verification attempt' },
        { status: 400 }
      );
    }

    if (new Date() > user.verificationExpiry) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    if (user.verificationCode !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: null,
        verificationExpiry: null
      }
    });

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'READ',
        entity: 'User',
        entityId: user.id,
        details: `User verified 2FA code: ${email}`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        customer: user.customer
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 