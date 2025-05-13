import { NextResponse } from 'next/server';
import { customers } from '../route';
import { Customer } from '../../../types/Customer';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const updatedCustomer: Customer = await request.json();

    // Basic validation
    if (!updatedCustomer.firstName || !updatedCustomer.lastName || !updatedCustomer.phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            firstName: !updatedCustomer.firstName ? 'First name is required' : '',
            lastName: !updatedCustomer.lastName ? 'Last name is required' : '',
            phoneNumber: !updatedCustomer.phoneNumber ? 'Phone number is required' : '',
          },
        },
        { status: 400 }
      );
    }

    const index = customers.findIndex((c: Customer) => c.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Ensure dob is a Date object
    const processedCustomer = {
      ...updatedCustomer,
      id,
      dob: new Date(updatedCustomer.dob)
    };

    // Update customer data
    customers[index] = processedCustomer;

    return NextResponse.json({ 
      success: true,
      data: customers[index]
    });
  } catch (error) {
    console.error('Error in PUT /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const index = customers.findIndex((c: Customer) => c.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Remove the customer
    customers.splice(index, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 