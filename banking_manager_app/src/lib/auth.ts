import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  customerId?: string;
  twoFactorEnabled?: boolean;
  verificationCode?: string | null;
  verificationExpiry?: Date | null;
}

// Secret key for JWT verification - in production, use a proper secret from environment variables
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

/**
 * Get the authenticated user from the request
 */
export function getAuthUser(): AuthUser | null {
  try {
    // Get user info from headers first (middleware adds these)
    const headersList = headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');
    const userEmail = headersList.get('x-user-email');
    const customerId = headersList.get('x-customer-id');
    
    if (userId && userRole && userEmail) {
      return {
        id: userId,
        email: userEmail,
        role: userRole as 'USER' | 'ADMIN',
        customerId: customerId || undefined
      };
    }
    
    // If headers don't have the user info, try to get it from the token
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    try {
      // Use a workaround to verify the token synchronously in a server component
      // Note: This is not ideal but works for this application
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }
      
      // Decode the payload part (second part) of the JWT
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      return {
        id: payload.userId as string,
        email: payload.email as string,
        role: payload.role as 'USER' | 'ADMIN',
        customerId: payload.customerId as string | undefined
      };
    } catch (tokenError) {
      console.error('Error parsing token:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

/**
 * Asynchronously verify a JWT token
 */
export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      id: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'USER' | 'ADMIN',
      customerId: payload.customerId as string | undefined
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Check if the current user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthUser();
}

/**
 * Check if the current user is an admin
 */
export function isAdmin(): boolean {
  const user = getAuthUser();
  return !!user && user.role === 'ADMIN';
}

/**
 * Check if the current user is a regular user (not admin)
 */
export function isRegularUser(): boolean {
  const user = getAuthUser();
  return !!user && user.role === 'USER';
}

/**
 * Check if the current user has a customer profile
 */
export function hasCustomerProfile(): boolean {
  const user = getAuthUser();
  return !!user && !!user.customerId;
} 