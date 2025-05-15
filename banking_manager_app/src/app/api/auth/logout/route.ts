import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/lib/auth';
import { logActivity, ActionType } from '@/lib/activity-logger';

export async function GET() {
  try {
    const user = getAuthUser();
    const cookieStore = cookies();
    
    // Log the logout if the user is authenticated
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
        // Continue even if logging fails
      }
    }
    
    // Delete the auth token cookie
    cookieStore.delete('auth-token');
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Logout error:', error);
    
    // Delete the auth token cookie even if there's an error
    cookies().delete('auth-token');
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}

// Add POST method implementation
export async function POST() {
  try {
    const user = getAuthUser();
    const cookieStore = cookies();
    
    // Log the logout if the user is authenticated
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
        // Continue even if logging fails
      }
    }
    
    // Delete the auth token cookie
    cookieStore.delete('auth-token');
    
    // Return a success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Delete the auth token cookie even if there's an error
    cookies().delete('auth-token');
    
    // Return a success response even if there was an error with logging
    return NextResponse.json({ success: true });
  }
} 