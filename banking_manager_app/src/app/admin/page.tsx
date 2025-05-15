import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getAuthUser, isAdmin } from '@/lib/auth';

async function getUsers() {
  try {
    return await prisma.user.findMany({
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        activityLogs: {
          take: 5,
          orderBy: {
            timestamp: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function getRecentLogs() {
  try {
    return await prisma.activityLog.findMany({
      take: 100,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

export default async function AdminDashboard() {
  const user = getAuthUser();
  
  if (!user || !isAdmin()) {
    redirect('/login');
  }

  const [users, recentLogs] = await Promise.all([
    getUsers(),
    getRecentLogs()
  ]);

  // Group logs by entity
  const logsByEntity: Record<string, number> = {};
  recentLogs.forEach(log => {
    logsByEntity[log.entity] = (logsByEntity[log.entity] || 0) + 1;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Main Dashboard
            </Link>
            <Link 
              href="/api/auth/logout" 
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Logout
            </Link>
          </div>
        </div>
        <p className="text-gray-600">Logged in as: {user.email} (Admin)</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Recent Activities</p>
              <p className="text-2xl font-bold">{recentLogs.length}</p>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mt-6 mb-2">Activity by Entity</h3>
          <div className="space-y-2">
            {Object.entries(logsByEntity).map(([entity, count]) => (
              <div key={entity} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{entity}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {count} activities
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {user.customer ? `${user.customer.firstName} ${user.customer.lastName}` : 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link 
                        href={`/admin/users/${user.id}`}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/users"
              className="text-blue-500 hover:text-blue-700"
            >
              View All Users
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity Logs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {log.user?.email || 'Unknown'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                      log.action === 'READ' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {log.entity}
                  </td>
                  <td className="px-4 py-2 text-sm max-w-xs truncate">
                    {log.details || 'No details'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link
            href="/admin/audit"
            className="text-blue-500 hover:text-blue-700"
          >
            View All Activity Logs
          </Link>
        </div>
      </div>
    </div>
  );
} 