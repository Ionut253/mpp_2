import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['USER', 'ADMIN']).optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, role } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with associated customer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: (role as UserRole) || UserRole.USER
        }
      });

      // Create customer for this user
      const customer = await tx.customer.create({
        data: {
          firstName,
          lastName,
          email,
          userId: user.id
        }
      });

      // Log the registration action
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entity: 'User',
          entityId: user.id,
          details: `User registered with email ${email}`
        }
      });

      return { user, customer };
    });

    // Return user data (excluding password)
    return NextResponse.json({
      success: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        customer: {
          id: result.customer.id,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName
        },
        createdAt: result.user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
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