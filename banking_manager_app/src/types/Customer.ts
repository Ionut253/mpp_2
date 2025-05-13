export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  accounts?: Account[];
}

export interface Account {
  id: string;
  accountType: string;
  balance: number;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  description?: string;
  accountId: string;
  createdAt: Date;
  account?: Account;
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
  pagination?: PaginationInfo;
} 