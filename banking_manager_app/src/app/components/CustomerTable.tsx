import React, { useState, useMemo } from 'react';
import { Customer, Account } from '../types/Customer';
import CustomerModal from './CustomerModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Pagination from './Pagination';
import { updateCustomer, deleteCustomer } from '../services/CustomerAPIService';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerUpdate: () => void;
  onCustomerDelete: (id: string) => void;
  onCustomerCreate: (customerData: Partial<Customer>) => Promise<boolean>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onCustomerUpdate,
  onCustomerDelete,
  onCustomerCreate,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Customer | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalBalance = (accounts: Account[] | undefined) => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  };

  const sortedAndFilteredCustomers = useMemo(() => {
    let result = [...customers];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
        (customer.address && customer.address.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        // Handle dates
        if (sortColumn === 'createdAt') {
          const aDate = aValue ? new Date(aValue.toString()).getTime() : 0;
          const bDate = bValue ? new Date(bValue.toString()).getTime() : 0;
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }

        // Handle strings
        const aString = aValue?.toString() || '';
        const bString = bValue?.toString() || '';
        return sortOrder === 'asc'
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString);
      });
    }

    return result;
  }, [customers, searchTerm, sortColumn, sortOrder]);

  const handleAddClick = () => {
    setSelectedCustomer(undefined);
    setError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer.id);
    setError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return false;

    try {
      const result = await deleteCustomer(customerToDelete);
      if (result.success) {
        onCustomerDelete(customerToDelete);
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
        setError(null);
        onCustomerUpdate();
        return true;
      } else {
        setError(result.errors?.delete || 'Failed to delete customer');
        return false;
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setError('Failed to delete customer');
      return false;
    }
  };

  const handleSubmit = async (customerData: Partial<Customer>) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      let success = false;

      if (selectedCustomer) {
        const result = await updateCustomer(selectedCustomer.id, customerData);
        if (result.success) {
          onCustomerUpdate();
          success = true;
        } else {
          const errorMessage = result.errors ? Object.values(result.errors).join(', ') : 'Failed to update customer';
          setError(errorMessage);
        }
      } else {
        // This is a create operation
        success = await onCustomerCreate(customerData);
      }

      if (success) {
        setIsModalOpen(false);
        setSelectedCustomer(undefined);
        setError(null);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to save customer');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={sortColumn || ''}
              onChange={(e) => setSortColumn(e.target.value as keyof Customer || null)}
              className="block w-40 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Sort by...</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="createdAt">Created Date</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Balance
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndFilteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm
                    ? 'No customers match your search criteria.'
                    : 'No customers found. Click "Add Customer" to create one.'}
                </td>
              </tr>
            ) : (
              sortedAndFilteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xl font-medium text-blue-600">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getTotalBalance(customer.accounts) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(getTotalBalance(customer.accounts))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(customer)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(customer)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(undefined);
          setError(null);
        }}
        onSubmit={handleSubmit}
        customer={selectedCustomer}
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
        isLoading={isUpdating}
      />

      <DeleteConfirmationModal
        isModalOpen={isDeleteModalOpen}
        setIsModalOpen={(isOpen) => {
          setIsDeleteModalOpen(isOpen);
          if (!isOpen) {
            setCustomerToDelete(null);
            setError(null);
          }
        }}
        onConfirmDelete={handleConfirmDelete}
        customerId={customerToDelete}
      />
    </div>
  );
};

export default CustomerTable; 