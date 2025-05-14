import { useState } from 'react';
import type { Account, Customer } from '@prisma/client';

interface AddTransactionFormProps {
  customer: Customer;
  accounts: Account[];
  onSave: (transactionData: { accountId: string; type: string; amount: number; description: string | null }) => Promise<void>;
  onCancel: () => void;
}

const TRANSACTION_DESCRIPTIONS = {
  DEPOSIT: ['Salary', 'Cash deposit', 'Check deposit', 'Transfer in', 'Interest'],
  WITHDRAWAL: ['ATM', 'Cash', 'Bill payment', 'Purchase', 'Transfer out'],
  TRANSFER: ['To savings', 'To checking', 'To friend', 'To family', 'Monthly transfer']
};

export function AddTransactionForm({ customer, accounts, onSave, onCancel }: AddTransactionFormProps) {
  const [formData, setFormData] = useState({
    accountId: accounts[0]?.id || '',
    type: 'DEPOSIT',
    amount: '',
    description: TRANSACTION_DESCRIPTIONS.DEPOSIT[0]
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: string) => {
    const descriptions = TRANSACTION_DESCRIPTIONS[type as keyof typeof TRANSACTION_DESCRIPTIONS];
    setFormData(prev => ({
      ...prev,
      type,
      description: descriptions[0]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.accountId) {
      setError('Please select an account');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSave({
        accountId: formData.accountId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-800">
        Create Transaction for {customer.firstName} {customer.lastName}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
          Select Account
        </label>
        <select
          id="accountId"
          value={formData.accountId}
          onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={isSubmitting}
        >
          <option value="">Select an account</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.accountType} - Balance: ${account.balance.toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Transaction Type
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={isSubmitting}
        >
          <option value="DEPOSIT">Deposit</option>
          <option value="WITHDRAWAL">Withdrawal</option>
          <option value="TRANSFER">Transfer</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <select
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={isSubmitting}
        >
          {TRANSACTION_DESCRIPTIONS[formData.type as keyof typeof TRANSACTION_DESCRIPTIONS].map(desc => (
            <option key={desc} value={desc}>{desc}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <input
          type="number"
          id="amount"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          step="0.01"
          min="0.01"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Transaction'}
        </button>
      </div>
    </form>
  );
} 