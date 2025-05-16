import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/lib/auth';
import { logActivity, ActionType } from '@/lib/activity-logger';

export async function GET() {
  try {
    const user = getAuthUser();
    const cookieStore = cookies();
    
    if (user?.id) {
      try {
        await logActivity({
          userId: user.id,
          action: 'READ',
          entity: 'User',
          entityId: user.id,
          details: `User logged out: ${user.email}`
        });
      } catch (error) {
        console.error('Error logging logout activity:', error);
      }
    }
    
    cookieStore.delete('auth-token');
    
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Logout error:', error);
    
    cookies().delete('auth-token');
    
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}

export async function POST() {
  try {
    const user = getAuthUser();
    const cookieStore = cookies();
    
    if (user?.id) {
      try {
        await logActivity({
          userId: user.id,
          action: 'READ',
          entity: 'User',
          entityId: user.id,
          details: `User logged out: ${user.email}`
        });
      } catch (error) {
        console.error('Error logging logout activity:', error);
      }
    }
    
    cookieStore.delete('auth-token');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    
    cookies().delete('auth-token');
    
    return NextResponse.json({ success: true });
  }
} 