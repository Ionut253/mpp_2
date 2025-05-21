import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../shared/DataTable';
import { format } from 'date-fns';
import { Edit, Trash, Plus, CreditCard, Receipt } from 'lucide-react';

interface CustomerTableProps {
  customers: any[];
  onEdit: (customer: any) => void;
  onDelete: (customer: any) => void;
  onAddAccount: (customer: any) => void;
  onAddTransaction: (customer: any) => void;
  onAddCustomer: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (searchTerm: string) => Promise<void>;
  isLoading?: boolean;
}

export function CustomerTable({
  customers,
  onEdit,
  onDelete,
  onAddAccount,
  onAddTransaction,
  onAddCustomer,
  currentPage,
  totalPages,
  onPageChange,
  onSearch,
  isLoading,
}: CustomerTableProps) {
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'firstName',
      header: 'First Name',
    },
    {
      accessorKey: 'lastName',
      header: 'Last Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      id: 'totalAccounts',
      header: 'Total Accounts',
      cell: ({ row }) => row.original.accounts?.length || 0,
    },
    {
      id: 'totalBalance',
      header: 'Total Balance',
      cell: ({ row }) => {
        const totalBalance = row.original.accounts?.reduce((sum: any, account: { balance: any; }) => sum + account.balance, 0) || 0;
        return (
          <span className={totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(totalBalance)}
          </span>
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
            title="Edit customer"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onAddAccount(row.original)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Add account"
          >
            <CreditCard className="h-4 w-4" />
          </button>
          <button
            onClick={() => onAddTransaction(row.original)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Add transaction"
          >
            <Receipt className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-red-600"
            title="Delete customer"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
        <button
          onClick={onAddCustomer}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        searchPlaceholder="Search customers..."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onSearch={onSearch}
        isLoading={isLoading}
      />
    </div>
  );
} 