import { Customer, APIResponse, PaginationInfo } from '../types/Customer';

// API Functions
export const fetchCustomers = async (
  searchTerm: string = '',
  sortColumn: string = '',
  sortOrder: 'asc' | 'desc' = 'asc',
  page: number = 1,
  pageSize: number = 10
): Promise<APIResponse<{ customers: Customer[]; pagination: PaginationInfo }>> => {
  try {
    const response = await fetch(
      `/api/customers?search=${searchTerm}&sort=${sortColumn}&order=${sortOrder}&page=${page}&pageSize=${pageSize}`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        errors: errorData.errors || { fetch: 'Failed to fetch customers' }
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching customers:', error);
    return {
      success: false,
      errors: { fetch: 'Failed to fetch customers' }
    };
  }
};

export const createCustomer = async (customer: Partial<Customer>): Promise<APIResponse<Customer>> => {
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        errors: data.errors || { create: 'Failed to create customer' }
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      errors: { create: 'Failed to create customer' }
    };
  }
};

export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<APIResponse<Customer>> => {
  try {
    const response = await fetch(`/api/customers?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        errors: data.errors || { update: 'Failed to update customer' }
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error updating customer:', error);
    return {
      success: false,
      errors: { update: 'Failed to update customer' }
    };
  }
};

export const deleteCustomer = async (id: string): Promise<APIResponse<void>> => {
  try {
    const response = await fetch(`/api/customers?id=${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        errors: data.errors || { delete: 'Failed to delete customer' }
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error deleting customer:', error);
    return {
      success: false,
      errors: { delete: 'Failed to delete customer' }
    };
  }
};

// Simple server status check
export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch {
    return false;
  }
}; 