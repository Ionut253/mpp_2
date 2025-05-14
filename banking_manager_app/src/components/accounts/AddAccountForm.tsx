import { useState } from 'react';
import type { Account, Customer } from '@prisma/client';

// Define standardized account types
const ACCOUNT_TYPES = {
  SAVINGS: {
    value: 'SAVINGS',
    label: 'Savings Account',
    description: 'Basic savings account with interest'
  },
  CHECKING: {
    value: 'CHECKING',
    label: 'Checking Account',
    description: 'Everyday transactions account'
  },
  BUSINESS: {
    value: 'BUSINESS',
    label: 'Business Account',
    description: 'Account for business transactions'
  },
  STUDENT: {
    value: 'STUDENT',
    label: 'Student Account',
    description: 'Special account for students'
  },
  JOINT: {
    value: 'JOINT',
    label: 'Joint Account',
    description: 'Shared account between multiple holders'
  },
  FIXED_DEPOSIT: {
    value: 'FIXED_DEPOSIT',
    label: 'Fixed Deposit',
    description: 'Term deposit with higher interest'
  }
} as const;

type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES]['value'];

interface AddAccountFormProps {
  customer: Customer;
  onSave: (accountData: { customerId: string; accountType: AccountType; balance: number }) => Promise<boolean>;
  onCancel: () => void;
}

export function AddAccountForm({ customer, onSave, onCancel }: AddAccountFormProps) {
  const [formData, setFormData] = useState<{
    accountType: AccountType;
    balance: number;
  }>({
    accountType: ACCOUNT_TYPES.SAVINGS.value,
    balance: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (formData.balance < 0) {
        throw new Error('Initial balance cannot be negative');
      }

      await onSave({
        customerId: customer.id,
        accountType: formData.accountType,
        balance: formData.balance
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-800">
        Create Account for {customer.firstName} {customer.lastName}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">
          Account Type
        </label>
        <select
          id="accountType"
          value={formData.accountType}
          onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value as AccountType }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={isSubmitting}
        >
          {Object.values(ACCOUNT_TYPES).map(type => (
            <option key={type.value} value={type.value} title={type.description}>
              {type.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {ACCOUNT_TYPES[formData.accountType as keyof typeof ACCOUNT_TYPES].description}
        </p>
      </div>

      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
          Initial Balance
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            id="balance"
            value={formData.balance}
            onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
            className="pl-7 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.01"
            min="0"
            required
            disabled={isSubmitting}
          />
        </div>
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
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
} 