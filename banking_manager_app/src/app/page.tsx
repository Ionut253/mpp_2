'use client';

import { useEffect, useState } from 'react';
import { AccountTable } from '@/components/accounts/AccountTable';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { EditCustomerForm } from '@/components/customers/EditCustomerForm';
import { EditAccountForm } from '@/components/accounts/EditAccountForm';
import { AddAccountForm } from '@/components/accounts/AddAccountForm';
import { EditTransactionForm } from '@/components/transactions/EditTransactionForm';
import { AddCustomerForm } from '@/components/customers/AddCustomerForm';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { CustomerTable } from '@/components/customers/CustomerTable';
import { Customer, Transaction } from '@/generated/client/default';
import { Account, AccountWithCustomer } from '@/types/account';

interface DeleteError {
  error: string;
  details?: {
    accountsWithTransactions: {
      id: string;
      type: string;
      transactionCount: number;
    }[];
  };
}

export default function DashboardPage() {
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<AccountWithCustomer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteError | null>(null);
  
  // Form states
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [addingAccountForCustomer, setAddingAccountForCustomer] = useState<Customer | null>(null);
  const [addingTransactionForCustomer, setAddingTransactionForCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Pagination states
  const [customerPagination, setCustomerPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [accountPagination, setAccountPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [transactionPagination, setTransactionPagination] = useState({ currentPage: 1, totalPages: 1 });

  // Constants
  const PAGE_SIZE = 5;

  // Load initial data when component mounts
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Loads initial data for all three tables
   */
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Reset all state collections
      setCustomers([]);
      setAccounts([]);
      setTransactions([]);
      
      // Load data in sequence - first customers, then accounts, then transactions
      console.log('Loading initial data...');
      
      await fetchCustomers(1);
      await fetchAccounts(1);
      await fetchTransactions(1);
      
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load initial data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch customers with pagination
   */
  const fetchCustomers = async (page = 1, search = '') => {
    try {
      setError(null);
      
      console.log(`Fetching customers page ${page} with search: '${search}'`);
      const response = await fetch(`/api/customers?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      console.log(`Fetched ${data.data.customers.length} customers (page ${page}/${data.data.pagination.totalPages})`);
      
      setCustomers(data.data.customers);
      setCustomerPagination({
        currentPage: data.data.pagination.currentPage,
        totalPages: data.data.pagination.totalPages
      });
      
      return data.data.customers;
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch customers. Please try again.');
      return [];
    }
  };

  /**
   * Fetch accounts with pagination
   */
  const fetchAccounts = async (page = 1, search = '') => {
    try {
      console.log(`Fetching accounts page ${page} with search: '${search}'`);
      
      // Construct the URL for paginated accounts
      const url = `/api/accounts?page=${page}&pageSize=${PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }
      
      console.log(`Fetched ${data.data.accounts.length} accounts (page ${page}/${data.data.pagination.totalPages})`);
      
      setAccounts(data.data.accounts);
      setAccountPagination({
        currentPage: data.data.pagination.currentPage,
        totalPages: data.data.pagination.totalPages
      });
      
      return data.data.accounts;
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch accounts. Please try again.');
      return [];
    }
  };

  /**
   * Fetch transactions with pagination and load related accounts
   */
  const fetchTransactions = async (page = 1, search = '') => {
    try {
      console.log(`Fetching transactions page ${page} with search: '${search}'`);
      
      const response = await fetch(`/api/transactions?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      
      console.log(`Fetched ${data.data.transactions.length} transactions (page ${page}/${data.data.pagination.totalPages})`);
      
      setTransactions(data.data.transactions);
      setTransactionPagination({
        currentPage: data.data.pagination.currentPage,
        totalPages: data.data.pagination.totalPages
      });
      
      // Ensure we have all accounts for these transactions
      await ensureAccountsForTransactions(data.data.transactions);
      
      return data.data.transactions;
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch transactions. Please try again.');
      return [];
    }
  };

  /**
   * Ensure all accounts needed for transactions are loaded
   */
  const ensureAccountsForTransactions = async (transactionsToCheck: Transaction[]) => {
    try {
      if (transactionsToCheck.length === 0) return;
      
      // Get the account IDs from transactions
      const transactionAccountIds = transactionsToCheck.map(t => t.accountId);
      const uniqueAccountIds = Array.from(new Set(transactionAccountIds));
      
      console.log(`Checking ${uniqueAccountIds.length} unique accounts needed for ${transactionsToCheck.length} transactions`);
      
      // Always reload transaction accounts to ensure consistency
      console.log(`Loading all transaction accounts: ${uniqueAccountIds.join(', ')}`);
      
      // Fetch all accounts needed for transactions
      const idsParam = uniqueAccountIds.join(',');
      const response = await fetch(`/api/accounts?ids=${idsParam}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch transaction accounts: HTTP ${response.status}`);
        setError('Could not load some transaction accounts. Please refresh the page.');
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to fetch transaction accounts:', data.error);
        setError('Could not load some transaction accounts. Please refresh the page.');
        return;
      }
      
      const loadedAccounts = data.data.accounts;
      console.log(`Successfully loaded ${loadedAccounts.length} accounts for transactions`);
      
      // Check if we got all the accounts we needed
      const loadedAccountIds = new Set(loadedAccounts.map((acc: AccountWithCustomer) => acc.id));
      const stillMissingIds = uniqueAccountIds.filter(id => !loadedAccountIds.has(id));
      
      if (stillMissingIds.length > 0) {
        console.warn(`${stillMissingIds.length} transaction accounts could not be found:`, stillMissingIds);
        setError(`${stillMissingIds.length} transaction accounts could not be found. Please refresh the page.`);
      } else {
        setError(null);
      }
      
      // Merge the newly loaded accounts with existing accounts
      setAccounts(prev => {
        const accountMap = new Map(prev.map(acc => [acc.id, acc]));
        
        loadedAccounts.forEach((account: AccountWithCustomer) => {
          accountMap.set(account.id, account);
        });
        
        return Array.from(accountMap.values());
      });
    } catch (error) {
      console.error('Error ensuring accounts for transactions:', error);
      setError('Failed to load transaction accounts. Please refresh the page.');
    }
  };

  /**
   * Synchronize all data to ensure consistency
   */
  const synchronizeAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Synchronizing all data...');
      
      // Load all data in order
      await fetchCustomers(customerPagination.currentPage);
      console.log('Customers refreshed');
      
      await fetchAccounts(accountPagination.currentPage);
      console.log('Accounts refreshed');
      
      const transactions = await fetchTransactions(transactionPagination.currentPage);
      console.log('Transactions refreshed');
      
      // Force reload of all transaction accounts
      if (transactions.length > 0) {
        await ensureAccountsForTransactions(transactions);
        console.log('Transaction accounts verified and updated');
      }
      
      console.log('Data synchronization complete');
    } catch (error) {
      console.error('Error synchronizing data:', error);
      setError('Failed to synchronize data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle deleting a customer
   */
  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete this customer? This will also delete all their accounts and transactions.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Deleting customer: ${customer.firstName} ${customer.lastName}`);
      const response = await fetch(`/api/customers/${customer.id}?force=true`, { 
        method: 'DELETE' 
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      console.log('Customer deleted successfully, synchronizing data...');
      
      // Use the synchronization function
      await synchronizeAllData();
      
      setDeleteError(null);
      console.log('All data synchronized successfully after customer deletion');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle deleting an account
   */
  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(`Are you sure you want to delete this account? This will also delete all associated transactions.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Deleting account: ${account.id} (${account.accountType})`);
      const response = await fetch(`/api/accounts?id=${account.id}&force=true`, { 
        method: 'DELETE' 
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }

      console.log('Account deleted successfully, synchronizing data...');
      
      // Use the synchronization function
      await synchronizeAllData();
      
      setDeleteError(null);
      console.log('All data synchronized successfully after account deletion');
    } catch (error) {
      console.error('Failed to delete account:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle deleting a transaction
   */
  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!confirm(`Are you sure you want to delete this transaction? This will update the account balance.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Deleting transaction: ${transaction.id} (${transaction.type})`);
      const response = await fetch(`/api/transactions/${transaction.id}`, { 
        method: 'DELETE' 
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      console.log('Transaction deleted successfully, determining target page...');
      
      // Check if we need to go to previous page (if this was the last transaction on the page)
      const currentPageResponse = await fetch(`/api/transactions?page=${transactionPagination.currentPage}`);
      const currentPageData = await currentPageResponse.json();
      
      if (!currentPageResponse.ok) {
        throw new Error(currentPageData.error || 'Failed to check transactions page');
      }
      
      if (!currentPageData.success) {
        throw new Error(currentPageData.error || 'Failed to check transactions page');
      }
      
      const shouldGoToPreviousPage = 
        currentPageData.data.transactions.length === 0 && 
        transactionPagination.currentPage > 1;

      const targetPage = shouldGoToPreviousPage 
        ? transactionPagination.currentPage - 1 
        : transactionPagination.currentPage;

      console.log(`Refreshing data with transactions target page: ${targetPage}...`);
      
      // Full data synchronization
      setIsLoading(true);
      
      // Load all data in order
      await fetchCustomers(customerPagination.currentPage);
      console.log('Customers refreshed');
      
      await fetchAccounts(accountPagination.currentPage);
      console.log('Accounts refreshed');
      
      const transactions = await fetchTransactions(targetPage);
      console.log('Transactions refreshed');
      
      // Force reload of all transaction accounts
      if (transactions.length > 0) {
        await ensureAccountsForTransactions(transactions);
        console.log('Transaction accounts verified and updated');
      }
      
      console.log('All data synchronized successfully after transaction deletion');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle editing a customer
   */
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  /**
   * Handle saving customer edits
   */
  const handleSaveCustomer = async (updatedCustomer: Partial<Customer>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Updating customer: ${editingCustomer!.id}`);
      
      const response = await fetch(`/api/customers/${editingCustomer!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomer)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update customer');
      }

      console.log('Customer updated successfully, synchronizing data...');
      
      // Use synchronizeAllData for complete data consistency
      await synchronizeAllData();
      
      setEditingCustomer(null);
      console.log('All data synchronized successfully after customer update');
    } catch (error) {
      console.error('Failed to update customer:', error);
      setError(error instanceof Error ? error.message : 'Failed to update customer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle editing an account
   */
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
  };

  /**
   * Handle saving account edits
   */
  const handleSaveAccount = async (updatedAccount: Partial<Account>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Updating account: ${editingAccount!.id}`);
      
      const response = await fetch(`/api/accounts/${editingAccount!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAccount)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update account');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update account');
      }

      console.log('Account updated successfully, synchronizing data...');
      
      // Use synchronizeAllData for complete data consistency
      await synchronizeAllData();
      
      setEditingAccount(null);
      console.log('All data synchronized successfully after account update');
    } catch (error) {
      console.error('Failed to update account:', error);
      setError(error instanceof Error ? error.message : 'Failed to update account');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle editing a transaction
   */
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  /**
   * Handle saving transaction edits
   */
  const handleSaveTransaction = async (updatedTransaction: Partial<Transaction>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Updating transaction: ${editingTransaction!.id}`);
      
      const response = await fetch(`/api/transactions/${editingTransaction!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTransaction)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      console.log('Transaction updated successfully, synchronizing data...');
      
      // Use synchronizeAllData for complete data consistency
      await synchronizeAllData();
      
      setEditingTransaction(null);
      console.log('All data synchronized successfully after transaction update');
    } catch (error) {
      console.error('Failed to update transaction:', error);
      setError(error instanceof Error ? error.message : 'Failed to update transaction');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle adding a new customer
   */
  const handleAddCustomer = () => {
    setIsAddingCustomer(true);
  };

  /**
   * Handle saving a new customer
   */
  const handleSaveNewCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Creating new customer...');
      
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add customer');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add customer');
      }

      console.log('Customer created successfully, synchronizing data...');
      
      // Use synchronizeAllData for complete data consistency
      await synchronizeAllData();
      
      setIsAddingCustomer(false);
      console.log('All data synchronized successfully after customer creation');
    } catch (error) {
      console.error('Failed to add customer:', error);
      setError(error instanceof Error ? error.message : 'Failed to add customer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle adding an account to a customer
   */
  const handleAddAccount = (customer: Customer) => {
    setAddingAccountForCustomer(customer);
  };

  /**
   * Handle saving a new account
   */
  const handleSaveNewAccount = async (accountData: { customerId: string; accountType: string; balance: number }) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log(`Creating new ${accountData.accountType} account for customer ${accountData.customerId}`);
      
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create account');
      }

      console.log('Account created successfully, synchronizing data...');
      
      // Use synchronizeAllData for complete data consistency
      await synchronizeAllData();
      
      setAddingAccountForCustomer(null);
      console.log('All data synchronized successfully after account creation');
      return true;
    } catch (error) {
      console.error('Failed to create account:', error);
      setError(error instanceof Error ? error.message : 'Failed to create account');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle adding a transaction for a customer
   */
  const handleAddTransaction = (customer: Customer) => {
    // Find the customer's accounts
    const customerAccounts = accounts.filter(account => account.customerId === customer.id);
    
    if (customerAccounts.length === 0) {
      setError('Customer has no accounts. Please create an account first.');
      return;
    }

    setAddingTransactionForCustomer(customer);
  };

  /**
   * Handle saving a new transaction
   */
  const handleSaveNewTransaction = async (transactionData: { accountId: string; type: string; amount: number; description: string | null }) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log(`Creating new ${transactionData.type} transaction for account ${transactionData.accountId}`);
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      console.log('Transaction created successfully, synchronizing data...');
      
      // Use synchronizeAllData for complete data consistency
      await synchronizeAllData();
      
      setAddingTransactionForCustomer(null);
      console.log('All data synchronized successfully after transaction creation');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      setError(error instanceof Error ? error.message : 'Failed to create transaction');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Also modify the refreshAllData function to use the synchronizeAllData function
  const refreshAllData = async () => {
    await synchronizeAllData();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h1 className="text-2xl font-bold mb-4">Banking Manager Dashboard</h1>
        <div className="flex gap-4">
          <a 
            href="/admin" 
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            Admin Dashboard
          </a>
          <a 
            href="/customer" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Customer Dashboard
          </a>
          <a 
            href="/login" 
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Login
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={refreshAllData}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
          >
            Refresh Data
          </button>
        </div>
      )}
      
      {deleteError && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>{deleteError.error}</p>
          {deleteError.details?.accountsWithTransactions && (
            <ul className="mt-2 list-disc list-inside">
              {deleteError.details.accountsWithTransactions.map(account => (
                <li key={account.id}>
                  {account.type} account has {account.transactionCount} transaction(s)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {isAddingCustomer ? (
            <AddCustomerForm
              onSave={handleSaveNewCustomer}
              onCancel={() => setIsAddingCustomer(false)}
            />
          ) : editingCustomer ? (
            <EditCustomerForm
              customer={editingCustomer}
              onSave={handleSaveCustomer}
              onCancel={() => setEditingCustomer(null)}
            />
          ) : addingAccountForCustomer ? (
            <AddAccountForm
              customer={addingAccountForCustomer}
              onSave={handleSaveNewAccount}
              onCancel={() => setAddingAccountForCustomer(null)}
            />
          ) : addingTransactionForCustomer ? (
            <AddTransactionForm
              customer={addingTransactionForCustomer}
              accounts={accounts.filter(a => a.customerId === addingTransactionForCustomer.id)}
              onSave={handleSaveNewTransaction}
              onCancel={() => setAddingTransactionForCustomer(null)}
            />
          ) : (
            <CustomerTable
              customers={customers}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
              onAddAccount={handleAddAccount}
              onAddTransaction={handleAddTransaction}
              onAddCustomer={handleAddCustomer}
              currentPage={customerPagination.currentPage}
              totalPages={customerPagination.totalPages}
              onPageChange={page => fetchCustomers(page)}
              onSearch={search => fetchCustomers(1, search)}
              isLoading={isLoading}
            />
          )}
          
          {editingAccount ? (
            <EditAccountForm
              account={editingAccount}
              onSave={handleSaveAccount}
              onCancel={() => setEditingAccount(null)}
            />
          ) : (
            <div className="mt-8">
              <AccountTable
                accounts={accounts}
                onEdit={(account) => handleEditAccount(account)}
                onDelete={(account) => handleDeleteAccount(account)}
                currentPage={accountPagination.currentPage}
                totalPages={accountPagination.totalPages}
                onPageChange={(page) => fetchAccounts(page)}
                onSearch={search => fetchAccounts(1, search)}
                isLoading={isLoading}
              />
            </div>
          )}
          
          {editingTransaction ? (
            <EditTransactionForm
              transaction={editingTransaction}
              onSave={handleSaveTransaction}
              onCancel={() => setEditingTransaction(null)}
            />
          ) : (
            <TransactionTable
              transactions={transactions}
              accounts={accounts}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              currentPage={transactionPagination.currentPage}
              totalPages={transactionPagination.totalPages}
              onPageChange={page => fetchTransactions(page)}
              onSearch={search => fetchTransactions(1, search)}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
