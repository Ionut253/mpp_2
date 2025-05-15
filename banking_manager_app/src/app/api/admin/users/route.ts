import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import bcrypt from 'bcryptjs';

// Get all users
export async function GET() {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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
      entity: 'User',
      entityId: 'all',
      details: 'Admin viewed all users'
    });

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Create a new user
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
    const { email, password, firstName, lastName, role } = data;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with associated customer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: role || 'USER'
        }
      });

      // Create customer profile if it's not an admin
      let customer = null;
      if (role !== 'ADMIN') {
        customer = await tx.customer.create({
          data: {
            firstName,
            lastName,
            email,
            userId: newUser.id
          }
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entity: 'User',
          entityId: newUser.id,
          details: `Admin created user ${email} with role ${role || 'USER'}`
        }
      });

      return { newUser, customer };
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.newUser.id,
          email: result.newUser.email,
          role: result.newUser.role,
          createdAt: result.newUser.createdAt
        },
        customer: result.customer ? {
          id: result.customer.id,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName
        } : null
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 