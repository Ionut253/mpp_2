export interface Account {
  id: string;
  accountType: 'SAVINGS' | 'CHECKING' | 'CREDIT';
  balance: number;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
} 