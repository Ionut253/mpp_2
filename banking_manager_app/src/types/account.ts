import { type Account, type Customer } from '@prisma/client';

export interface AccountWithCustomer extends Account {
  customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'email'>;
  _count?: {
    transactions: number;
  };
}

export type { Account }; 