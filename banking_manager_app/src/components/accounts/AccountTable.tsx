import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../shared/DataTable';
import { format } from 'date-fns';
import { Edit, Trash } from 'lucide-react';
import { type AccountWithCustomer } from '@/types/account';

interface AccountTableProps {
  accounts: AccountWithCustomer[];
  onEdit: (account: AccountWithCustomer) => void;
  onDelete: (account: AccountWithCustomer) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (searchTerm: string) => Promise<void>;
  isLoading?: boolean;
}

export function AccountTable({
  accounts,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  onSearch,
  isLoading,
}: AccountTableProps) {
  const columns: ColumnDef<AccountWithCustomer>[] = [
    {
      accessorKey: 'accountType',
      header: 'Account Type',
      cell: ({ row }) => {
        const accountType = row.original.accountType;
        return (
          <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-blue-100 text-blue-800">
            {accountType}
          </span>
        );
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        const balance = row.original.balance;
        return (
          <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              signDisplay: 'always'
            }).format(balance)}
          </span>
        );
      },
    },
    {
      id: 'customerName',
      header: 'Customer Name',
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {customer.firstName} {customer.lastName}
            </span>
            <span className="text-sm text-gray-500">
              {customer.email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
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
            title="Edit account"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-red-600"
            title="Delete account"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
      
      <DataTable
        data={accounts}
        columns={columns}
        searchPlaceholder="Search accounts..."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onSearch={onSearch}
        isLoading={isLoading}
      />
    </div>
  );
} 