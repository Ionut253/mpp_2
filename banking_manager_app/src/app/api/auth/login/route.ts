import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { generateVerificationCode, sendVerificationCode } from '@/lib/email-service';
import { User } from '@/types/prisma';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

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

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    if (user.twoFactorEnabled) {
      const verificationCode = generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode,
          verificationExpiry
        }
      });

      const emailSent = await sendVerificationCode(user.email, verificationCode);
      if (!emailSent) {
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        requiresVerification: true,
        email: user.email
      });
    }

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
        details: `User logged in with email ${email}`
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
    console.error('Login error:', error);
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