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

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export function getAuthUser(): AuthUser | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          return null;
        }
        
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
    }

    // Fallback to headers if no valid token in cookies
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
    
    return null;
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

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

export function isAuthenticated(): boolean {
  return !!getAuthUser();
}


export function isAdmin(): boolean {
  const user = getAuthUser();
  return !!user && user.role === 'ADMIN';
}

export function isRegularUser(): boolean {
  const user = getAuthUser();
  return !!user && user.role === 'USER';
}

export function hasCustomerProfile(): boolean {
  const user = getAuthUser();
  return !!user && !!user.customerId;
} 