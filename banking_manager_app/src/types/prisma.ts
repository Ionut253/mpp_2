import { User as PrismaUser } from '@/generated/client';

export interface User extends PrismaUser {
  twoFactorEnabled: boolean;
  verificationCode: string | null;
  verificationExpiry: Date | null;
}

export type UserUpdateInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>; 