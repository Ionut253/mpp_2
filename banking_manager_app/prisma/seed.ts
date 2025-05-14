import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

const CUSTOMER_COUNT = 25
const MIN_ACCOUNTS_PER_CUSTOMER = 1
const MAX_ACCOUNTS_PER_CUSTOMER = 3
const MIN_TRANSACTIONS_PER_ACCOUNT = 3
const MAX_TRANSACTIONS_PER_ACCOUNT = 10

const ACCOUNT_TYPES = ['SAVINGS', 'CHECKING', 'BUSINESS', 'INVESTMENT']
const TRANSACTION_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']

// Function to generate simple phone numbers in 07XX-XXX-XXX format
const generateSimplePhoneNumber = () => {
  const prefix = '07';
  const part1 = faker.number.int({ min: 10, max: 99 });
  const part2 = faker.number.int({ min: 100, max: 999 });
  const part3 = faker.number.int({ min: 100, max: 999 });
  return `${prefix}${part1}-${part2}-${part3}`;
};

// Function to generate simple transaction descriptions
const generateTransactionDescription = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return faker.helpers.arrayElement([
        'Salary',
        'Cash deposit',
        'Check deposit',
        'Transfer in',
        'Interest'
      ]);
    case 'WITHDRAWAL':
      return faker.helpers.arrayElement([
        'ATM',
        'Cash',
        'Bill payment',
        'Purchase',
        'Transfer out'
      ]);
    case 'TRANSFER':
      return faker.helpers.arrayElement([
        'To savings',
        'To checking',
        'To friend',
        'To family',
        'Monthly transfer'
      ]);
    default:
      return type;
  }
};

async function main() {
  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.customer.deleteMany();

  console.log('Creating customers...');
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    // Create customer
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }),
        phone: generateSimplePhoneNumber(),
        address: faker.location.streetAddress(),
        dob: faker.date.between({ 
          from: new Date('1960-01-01'), 
          to: new Date('2000-12-31') 
        }),
      },
    });

    // Create 1-3 accounts for each customer
    const accountCount = faker.number.int({ 
      min: MIN_ACCOUNTS_PER_CUSTOMER, 
      max: MAX_ACCOUNTS_PER_CUSTOMER 
    });

    for (let j = 0; j < accountCount; j++) {
      const account = await prisma.account.create({
        data: {
          accountType: faker.helpers.arrayElement(ACCOUNT_TYPES),
          balance: 0, // We'll calculate this based on transactions
          customerId: customer.id,
        },
      });

      // Create 3-10 transactions for each account
      const transactionCount = faker.number.int({ 
        min: MIN_TRANSACTIONS_PER_ACCOUNT, 
        max: MAX_TRANSACTIONS_PER_ACCOUNT 
      });

      let balance = 0;
      for (let k = 0; k < transactionCount; k++) {
        const type = faker.helpers.arrayElement(TRANSACTION_TYPES);
        const amount = parseFloat(faker.finance.amount({ min: 50, max: 5000 }));
        
        // Update balance based on transaction type
        if (type === 'DEPOSIT') {
          balance += amount;
        } else if (type === 'WITHDRAWAL') {
          balance = Math.max(0, balance - amount); // Prevent negative balance
        } else {
          // For transfers, randomly add or subtract
          balance += faker.helpers.arrayElement([1, -1]) * amount;
          balance = Math.max(0, balance); // Prevent negative balance
        }

        await prisma.transaction.create({
          data: {
            type,
            amount,
            description: generateTransactionDescription(type),
            accountId: account.id,
            createdAt: faker.date.between({ 
              from: new Date('2023-01-01'), 
              to: new Date() 
            }),
          },
        });
      }

      // Update account balance
      await prisma.account.update({
        where: { id: account.id },
        data: { balance },
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`Created ${i + 1} customers...`);
    }
  }

  const customerCount = await prisma.customer.count();
  const accountCount = await prisma.account.count();
  const transactionCount = await prisma.transaction.count();

  console.log('\nSeeding completed!');
  console.log('-------------------');
  console.log(`Created ${customerCount} customers`);
  console.log(`Created ${accountCount} accounts`);
  console.log(`Created ${transactionCount} transactions`);
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 