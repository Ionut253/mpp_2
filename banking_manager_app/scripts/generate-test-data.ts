import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

// Create a simple script to generate test data without using worker threads
const prisma = new PrismaClient();

// Constants for data generation
const CUSTOMER_COUNT = 100000;
const BATCH_SIZE = 5000;
const ACCOUNTS_PER_CUSTOMER_MIN = 1;
const ACCOUNTS_PER_CUSTOMER_MAX = 3;
const TRANSACTIONS_PER_ACCOUNT_MIN = 5;
const TRANSACTIONS_PER_ACCOUNT_MAX = 15;

async function generateTestData() {
  console.log('Generating large test dataset for performance testing...');
  console.log(`Target: ${CUSTOMER_COUNT} customers with multiple accounts and transactions`);
  
  const startTime = Date.now();
  
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customer.deleteMany();
    
    // Generate customers in batches
    console.log(`Creating ${CUSTOMER_COUNT} customers in batches of ${BATCH_SIZE}...`);
    
    for (let batchStart = 0; batchStart < CUSTOMER_COUNT; batchStart += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, CUSTOMER_COUNT - batchStart);
      const customers = [];
      
      for (let i = 0; i < batchSize; i++) {
        customers.push({
          id: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          dob: faker.date.past({ years: 70 }),
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent()
        });
      }
      
      await prisma.customer.createMany({
        data: customers,
        skipDuplicates: true
      });
      
      console.log(`Created ${batchStart + batchSize}/${CUSTOMER_COUNT} customers...`);
    }
    
    // Fetch all customer IDs
    console.log('Fetching customer IDs...');
    const customerIds = await prisma.customer.findMany({ select: { id: true } });
    console.log(`Retrieved ${customerIds.length} customer IDs`);
    
    // Generate accounts for a subset of customers to avoid overwhelming the database
    // We'll create accounts for 10% of customers (still 10,000 customers with accounts)
    const selectedCustomerIds = customerIds
      .sort(() => Math.random() - 0.5) // Shuffle array
      .slice(0, Math.floor(customerIds.length * 0.1)); // Take 10%
    
    console.log(`Creating accounts for ${selectedCustomerIds.length} customers...`);
    
    // Generate accounts in batches
    let totalAccounts = 0;
    const accountIds = [];
    
    for (let batchStart = 0; batchStart < selectedCustomerIds.length; batchStart += BATCH_SIZE) {
      const customerBatch = selectedCustomerIds.slice(
        batchStart, 
        batchStart + BATCH_SIZE
      );
      
      const accounts = [];
      const accountTypes = ['SAVINGS', 'CHECKING', 'CREDIT', 'INVESTMENT', 'LOAN'];
      
      for (const { id: customerId } of customerBatch) {
        const accountCount = faker.number.int({ 
          min: ACCOUNTS_PER_CUSTOMER_MIN, 
          max: ACCOUNTS_PER_CUSTOMER_MAX 
        });
        
        for (let i = 0; i < accountCount; i++) {
          const accountType = accountTypes[faker.number.int({ min: 0, max: accountTypes.length - 1 })];
          let minBalance = 100, maxBalance = 10000;
          
          if (accountType === 'INVESTMENT') {
            minBalance = 5000;
            maxBalance = 500000;
          } else if (accountType === 'LOAN') {
            minBalance = -50000;
            maxBalance = -1000;
          } else if (accountType === 'CREDIT') {
            minBalance = -10000;
            maxBalance = 5000;
          }
          
          const accountId = faker.string.uuid();
          accounts.push({
            id: accountId,
            accountType,
            balance: Number(faker.number.float({ min: minBalance, max: maxBalance, fractionDigits: 2 })),
            customerId,
            createdAt: faker.date.past({ years: 1 }),
            updatedAt: faker.date.recent()
          });
          
          accountIds.push(accountId);
        }
      }
      
      await prisma.account.createMany({
        data: accounts,
        skipDuplicates: true
      });
      
      totalAccounts += accounts.length;
      console.log(`Created ${totalAccounts} accounts so far...`);
    }
    
    // Save account IDs to avoid keeping them all in memory
    const tempFile = path.join(process.cwd(), 'temp_account_ids.json');
    fs.writeFileSync(tempFile, JSON.stringify(accountIds));
    
    // Generate transactions in batches (by account) to avoid memory issues
    console.log('Creating transactions for accounts...');
    const ACCOUNT_BATCH_SIZE = 1000;
    let totalTransactions = 0;
    
    for (let batchStart = 0; batchStart < accountIds.length; batchStart += ACCOUNT_BATCH_SIZE) {
      const accountBatch = accountIds.slice(
        batchStart, 
        batchStart + ACCOUNT_BATCH_SIZE
      );
      
      const transactions = [];
      const transactionTypes = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'REFUND', 'FEE'];
      const descriptions = [
        'Monthly payment',
        'Grocery shopping',
        'Salary deposit',
        'Online purchase',
        'Bank transfer',
        'Withdrawal at ATM',
        'Bill payment',
        'Subscription fee',
        'Rent payment',
        'Interest credited'
      ];
      
      for (const accountId of accountBatch) {
        const transactionCount = faker.number.int({ 
          min: TRANSACTIONS_PER_ACCOUNT_MIN, 
          max: TRANSACTIONS_PER_ACCOUNT_MAX 
        });
        
        for (let i = 0; i < transactionCount; i++) {
          const type = transactionTypes[faker.number.int({ min: 0, max: transactionTypes.length - 1 })];
          
          // Amount range depends on transaction type
          let minAmount = 10, maxAmount = 1000;
          if (type === 'TRANSFER') {
            minAmount = 100;
            maxAmount = 10000;
          } else if (type === 'PAYMENT') {
            minAmount = 50;
            maxAmount = 5000;
          } else if (type === 'FEE') {
            minAmount = 1;
            maxAmount = 100;
          }
          
          const amount = Number(faker.number.float({ 
            min: minAmount, 
            max: maxAmount, 
            fractionDigits: 2 
          }));
          
          // Generate dates within the last year
          const createdAt = faker.date.past({ years: 1 });
          
          transactions.push({
            id: faker.string.uuid(),
            amount,
            type,
            accountId,
            createdAt,
            description: descriptions[faker.number.int({ min: 0, max: descriptions.length - 1 })] + 
                        ' - ' + faker.finance.transactionDescription()
          });
        }
      }
      
      await prisma.transaction.createMany({
        data: transactions,
        skipDuplicates: true
      });
      
      totalTransactions += transactions.length;
      console.log(`Created ${totalTransactions} transactions so far (processing ${batchStart + accountBatch.length}/${accountIds.length} accounts)...`);
    }
    
    // Create optimized indices
    console.log('Creating optimized indices...');
    
    try {
      // Index for transaction date range queries
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Transaction_createdAt_type_idx" 
        ON "Transaction" ("createdAt", "type");
      `);
      
      // Composite index for account balance and type
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Account_balance_accountType_idx" 
        ON "Account" ("balance", "accountType");
      `);
      
      // Index for transaction amount
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Transaction_amount_idx" 
        ON "Transaction" ("amount");
      `);
      
      console.log('Successfully created optimized indices');
    } catch (error) {
      console.error('Error creating indices:', error);
    }
    
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    // Print summary
    const customerCount = await prisma.customer.count();
    const accountCount = await prisma.account.count();
    const transactionCount = await prisma.transaction.count();
    
    const endTime = Date.now();
    const durationMinutes = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\nLarge test data generation complete!');
    console.log(`Created ${customerCount} customers`);
    console.log(`Created ${accountCount} accounts`);
    console.log(`Created ${transactionCount} transactions`);
    console.log(`Time taken: ${durationMinutes} minutes`);
    console.log('Database is ready for performance testing');
  } catch (error) {
    console.error('Error generating test data:', error);
    throw error;
  }
}

generateTestData()
  .catch(error => {
    console.error('Error in main execution:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 