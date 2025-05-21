import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const user = getAuthUser();
    
    if (!user || !isAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get distinct entity values from activity logs
    const entities = await prisma.$queryRaw<{ entity: string }[]>`
      SELECT DISTINCT "entity" 
      FROM "ActivityLog" 
      ORDER BY "entity" ASC
    `;

    const entityList = entities.map((item:any) => item.entity);

    return NextResponse.json({
      success: true,
      data: entityList
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
} 