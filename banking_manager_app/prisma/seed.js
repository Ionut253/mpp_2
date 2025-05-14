"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
// Function to generate simple phone numbers in (XXX) XXX-XXXX format
const generatePhoneNumber = () => {
    const areaCode = faker_1.faker.number.int({ min: 100, max: 999 });
    const firstPart = faker_1.faker.number.int({ min: 100, max: 999 });
    const secondPart = faker_1.faker.number.int({ min: 1000, max: 9999 });
    return `(${areaCode}) ${firstPart}-${secondPart}`;
};
// Function to generate a realistic transaction description
const generateTransactionDescription = (type, amount, toAccount) => {
    switch (type) {
        case 'DEPOSIT':
            return faker_1.faker.helpers.arrayElement([
                'Salary deposit',
                'Check deposit',
                'ATM deposit',
                'Mobile deposit',
                'Direct deposit',
            ]);
        case 'WITHDRAWAL':
            return faker_1.faker.helpers.arrayElement([
                'ATM withdrawal',
                'Cash withdrawal',
                'Bill payment',
                'Debit card purchase',
                'Online purchase',
            ]);
        case 'TRANSFER':
            return `Transfer to account ${toAccount}`;
    }
};
async function main() {
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customer.deleteMany();
    console.log('Deleted existing records');
    // Create customers
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@email.com',
                phone: '+1234567890',
                address: '123 Main St, Springfield, IL',
                dob: new Date('1985-03-15')
            }
        }),
        prisma.customer.create({
            data: {
                firstName: 'Sarah',
                lastName: 'Johnson',
                email: 'sarah.j@email.com',
                phone: '+1987654321',
                address: '456 Oak Ave, Chicago, IL',
                dob: new Date('1990-07-22')
            }
        }),
        prisma.customer.create({
            data: {
                firstName: 'Michael',
                lastName: 'Brown',
                email: 'michael.b@email.com',
                phone: '+1122334455',
                address: '789 Pine Rd, Boston, MA',
                dob: new Date('1978-11-30')
            }
        }),
        prisma.customer.create({
            data: {
                firstName: 'Emily',
                lastName: 'Davis',
                email: 'emily.davis@email.com',
                phone: '+1555666777',
                address: '321 Elm St, San Francisco, CA',
                dob: new Date('1992-04-18')
            }
        }),
        prisma.customer.create({
            data: {
                firstName: 'Robert',
                lastName: 'Wilson',
                email: 'robert.w@email.com',
                phone: '+1999888777',
                address: '654 Maple Dr, Seattle, WA',
                dob: new Date('1982-09-05')
            }
        })
    ]);
    console.log('Created customers');
    // Create accounts for each customer
    const accounts = [];
    for (const customer of customers) {
        // Savings account for everyone
        accounts.push(await prisma.account.create({
            data: {
                customerId: customer.id,
                accountType: 'SAVINGS',
                balance: Math.floor(Math.random() * 10000) + 1000 // Random balance between 1000 and 11000
            }
        }));
        // Checking account for everyone
        accounts.push(await prisma.account.create({
            data: {
                customerId: customer.id,
                accountType: 'CHECKING',
                balance: Math.floor(Math.random() * 5000) + 500 // Random balance between 500 and 5500
            }
        }));
        // Credit account for some customers
        if (Math.random() > 0.5) {
            accounts.push(await prisma.account.create({
                data: {
                    customerId: customer.id,
                    accountType: 'CREDIT',
                    balance: 0
                }
            }));
        }
    }
    console.log('Created accounts');
    // Create transactions
    const transactionTypes = ['DEPOSIT', 'WITHDRAWAL'];
    const transactionDescriptions = [
        'Salary deposit',
        'ATM withdrawal',
        'Online purchase',
        'Bill payment',
        'Transfer',
        'Grocery shopping',
        'Restaurant payment',
        'Utility bill',
        'Subscription payment',
        'Insurance premium'
    ];
    for (const account of accounts) {
        // Create 3-7 transactions per account
        const numTransactions = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < numTransactions; i++) {
            const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
            const amount = Math.floor(Math.random() * 1000) + 100; // Random amount between 100 and 1100
            const description = transactionDescriptions[Math.floor(Math.random() * transactionDescriptions.length)];
            // Create transaction with a random date in the last 30 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            await prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type,
                    amount,
                    description,
                    createdAt: date
                }
            });
        }
    }
    console.log('Created transactions');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
