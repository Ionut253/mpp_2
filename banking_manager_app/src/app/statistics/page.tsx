'use client';

import React, { useEffect, useState } from 'react';
import { Customer } from '../types/Customer';
import Link from 'next/link';

const Statistics = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('customerData');
    if (storedData) {
      setCustomers(JSON.parse(storedData));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalCustomers = customers.length;
  const totalBalance = customers.reduce((sum, customer) => sum + customer.balance, 0);
  const averageBalance = totalCustomers > 0 ? totalBalance / totalCustomers : 0;

  // Age distribution
  const ageGroups = customers.reduce((acc: { [key: string]: number }, customer) => {
    const age = new Date().getFullYear() - new Date(customer.dob).getFullYear();
    const group = Math.floor(age / 10) * 10;
    acc[`${group}-${group + 9}`] = (acc[`${group}-${group + 9}`] || 0) + 1;
    return acc;
  }, {});

  // Balance distribution
  const balanceGroups = customers.reduce((acc: { [key: string]: number }, customer) => {
    const balance = customer.balance;
    const group = Math.floor(balance / 1000) * 1000;
    acc[`$${group}-${group + 999}`] = (acc[`$${group}-${group + 999}`] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Customer Statistics</h1>
            <Link
              href="/"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Total Customers</h3>
              <p className="text-3xl font-bold text-blue-600">{totalCustomers}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Total Balance</h3>
              <p className="text-3xl font-bold text-green-600">
                ${totalBalance.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Average Balance</h3>
              <p className="text-3xl font-bold text-purple-600">
                ${averageBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
              <div className="space-y-2">
                {Object.entries(ageGroups)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([range, count]) => (
                    <div key={range} className="flex items-center">
                      <span className="w-24 text-sm">{range} years</span>
                      <div className="flex-1 mx-2">
                        <div
                          className="bg-blue-500 h-4 rounded"
                          style={{
                            width: `${(count / totalCustomers) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-12 text-sm text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Balance Distribution</h3>
              <div className="space-y-2">
                {Object.entries(balanceGroups)
                  .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
                  .map(([range, count]) => (
                    <div key={range} className="flex items-center">
                      <span className="w-32 text-sm">{range}</span>
                      <div className="flex-1 mx-2">
                        <div
                          className="bg-green-500 h-4 rounded"
                          style={{
                            width: `${(count / totalCustomers) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-12 text-sm text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics; 