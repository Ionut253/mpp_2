import { type Transaction } from '@prisma/client';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../shared/DataTable';
import { format } from 'date-fns';
import { Edit, Trash, AlertTriangle } from 'lucide-react';
import { type AccountWithCustomer } from '@/types/account';
import { useEffect } from 'react';

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: AccountWithCustomer[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (searchTerm: string) => Promise<void>;
  isLoading?: boolean;
}

export function TransactionTable({
  transactions,
  accounts,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  onSearch,
  isLoading,
}: TransactionTableProps) {
  // Log available accounts and transactions for debugging
  useEffect(() => {
    console.log(`TransactionTable: ${transactions.length} transactions, ${accounts.length} accounts available`);
    
    // Check if any transactions are missing accounts
    const missingAccounts = transactions.filter(
      transaction => !accounts.some(account => account.id === transaction.accountId)
    );
    
    if (missingAccounts.length > 0) {
      console.error('Transactions with missing accounts:', missingAccounts);
      console.log('Available account IDs:', accounts.map(a => a.id));
    }
  }, [transactions, accounts]);

  const getAccountInfo = (accountId: string) => {
    const account = accounts.find(account => account.id === accountId);
    if (!account) {
      console.warn(`Account not found for transaction with accountId: ${accountId}`);
    }
    return account;
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      id: 'accountInfo',
      header: 'Account Info',
      cell: ({ row }) => {
        const accountId = row.original.accountId;
        const account = getAccountInfo(accountId);
        
        if (!account) {
          return (
            <div className="flex items-center text-amber-500">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Account not found ({accountId.substring(0, 8)}...)</span>
            </div>
          );
        }
        
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {account.accountType} Account
            </span>
            {account.customer ? (
              <span className="text-sm text-gray-500">
                Owner: {account.customer.firstName} {account.customer.lastName}
              </span>
            ) : (
              <span className="text-sm text-amber-500">
                Owner information unavailable
              </span>
            )}
            <span className="text-xs text-gray-400">
              Balance: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(account.balance)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
            row.original.type === 'DEPOSIT'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.original.amount;
        return (
          <span className={row.original.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              signDisplay: 'always'
            }).format(row.original.type === 'WITHDRAWAL' ? -amount : amount)}
          </span>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.original.description || '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.createdAt), 'dd/MM/yyyy HH:mm'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(row.original)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Edit transaction"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-red-600"
            title="Delete transaction"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
      
      <DataTable
        data={transactions}
        columns={columns}
        searchPlaceholder="Search transactions..."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onSearch={onSearch}
        isLoading={isLoading}
      />
      
      {transactions.some(t => !accounts.find(a => a.id === t.accountId)) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <div>
              <p className="font-medium">Some transaction accounts could not be found</p>
              <p className="text-sm">This may be due to a data synchronization issue. Try refreshing the page.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 