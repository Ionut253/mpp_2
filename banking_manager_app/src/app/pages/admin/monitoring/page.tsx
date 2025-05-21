'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface MonitoredUser {
  id: string;
  userId: string;
  user: {
    email: string;
  };
  reason: string;
  createdAt: string;
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function MonitoringPage() {
  const [monitoredUsers, setMonitoredUsers] = useState<MonitoredUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [monitoredResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/monitored-users'),
        fetch('/api/admin/users')
      ]);

      if (!monitoredResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const monitoredData = await monitoredResponse.json();
      const usersData = await usersResponse.json();

      setMonitoredUsers(monitoredData.data);
      setUsers(usersData.data);
    } catch (error) {
      setError('Failed to load monitoring data');
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonitorUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !reason) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/admin/monitored-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          reason
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add user to monitoring');
      }

      await fetchData();
      setSelectedUser('');
      setReason('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add user to monitoring');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMonitoring = async (userId: string, currentStatus: boolean) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/monitored-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update monitoring status');
      }

      await fetchData();
    } catch (error) {
      setError('Failed to update monitoring status');
      console.error('Update error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white shadow">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleMonitorUser} className="space-y-4">
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-700">
                Select User
              </label>
              <select
                id="user"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a user</option>
                {users
                  .filter(user => !monitoredUsers.some(m => m.userId === user.id && m.isActive))
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason for Monitoring
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add to Monitoring'}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Monitored Users</h3>
          <div className="mt-4">
            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                          Email
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Reason
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Added
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monitoredUsers.map((monitoredUser) => (
                        <tr key={monitoredUser.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {monitoredUser.user.email}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {monitoredUser.reason}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(new Date(monitoredUser.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              monitoredUser.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {monitoredUser.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                            <button
                              onClick={() => handleToggleMonitoring(monitoredUser.id, monitoredUser.isActive)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {monitoredUser.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {monitoredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                            No users are currently being monitored
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 