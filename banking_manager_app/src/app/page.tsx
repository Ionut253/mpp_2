'use client';

import { useEffect, useState } from 'react';
import CustomerTable from './components/CustomerTable';
import { Customer } from './types/Customer';
import { fetchCustomers, createCustomer } from './services/CustomerAPIService';

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  const loadCustomers = async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchCustomers('', '', 'asc', page, pageSize);
      
      if (result.success && result.data) {
        setCustomers(result.data.customers);
        setTotalPages(result.data.pagination.totalPages);
        setCurrentPage(result.data.pagination.currentPage);
      } else {
        setError('Failed to load customers. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setError('Failed to load customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handlePageChange = (page: number) => {
    loadCustomers(page);
  };

  const handleCustomerUpdate = async () => {
    await loadCustomers();
  };

  const handleCustomerDelete = (id: string) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
  };

  const handleCustomerCreate = async (customerData: Partial<Customer>) => {
    try {
      const result = await createCustomer(customerData);
      if (result.success && result.data) {
        await handleCustomerUpdate(); // Refresh the customer list
        setError(null); // Clear any existing errors
        return true;
      } else {
        // Handle validation errors or unique constraint violations
        const errorMessage = result.errors 
          ? Object.values(result.errors).join(', ') 
          : 'Failed to create customer';
        setError(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      setError('Failed to create customer. Please try again.');
      return false;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Banking Manager</h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="inline-flex rounded-md">
                <a
                  href="/statistics"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Statistics
                </a>
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-4">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
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
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <CustomerTable
              customers={customers}
              onCustomerUpdate={handleCustomerUpdate}
              onCustomerDelete={handleCustomerDelete}
              onCustomerCreate={handleCustomerCreate}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </main>
  );
}
