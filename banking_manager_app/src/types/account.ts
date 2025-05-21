import { Customer } from '@/generated/client/default';

export interface Account {
  id: string;
  accountType: string;
  balance: number;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountWithCustomer extends Account {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    transactions: number;
  };
}