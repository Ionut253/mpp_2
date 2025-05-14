import { headers } from 'next/headers';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export function getAuthUser(): AuthUser | null {
  const headersList = headers();
  const userId = headersList.get('x-user-id');
  const userRole = headersList.get('x-user-role');
  const userEmail = headersList.get('x-user-email');

  if (!userId || !userRole || !userEmail) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    role: userRole as 'USER' | 'ADMIN'
  };
}

export function isAdmin(): boolean {
  const user = getAuthUser();
  return user?.role === 'ADMIN';
} 