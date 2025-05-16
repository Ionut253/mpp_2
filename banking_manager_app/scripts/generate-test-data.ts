import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CUSTOMER_COUNT = 100000;
const BATCH_SIZE = 5000;
const ACCOUNTS_PER_CUSTOMER_MIN = 1;
const ACCOUNTS_PER_CUSTOMER_MAX = 3;
const TRANSACTIONS_PER_ACCOUNT_MIN = 5;
const TRANSACTIONS_PER_ACCOUNT_MAX = 15;

async function generateTestData() {
  const startTime = Date.now();
  
  try {
    console.log('Clearing existing data...');
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customer.deleteMany();
    
    
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
      
    }
    
    const customerIds = await prisma.customer.findMany({ select: { id: true } });
    
    const selectedCustomerIds = customerIds
      .sort(() => Math.random() - 0.5) 
      .slice(0, Math.floor(customerIds.length * 0.1)); 
    
    
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
    
    const tempFile = path.join(process.cwd(), 'temp_account_ids.json');
    fs.writeFileSync(tempFile, JSON.stringify(accountIds));
    
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
    
    console.log('Creating optimized indices...');
    
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Transaction_createdAt_type_idx" 
        ON "Transaction" ("createdAt", "type");
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Account_balance_accountType_idx" 
        ON "Account" ("balance", "accountType");
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Transaction_amount_idx" 
        ON "Transaction" ("amount");
      `);
      
      console.log('Successfully created optimized indices');
    } catch (error) {
      console.error('Error creating indices:', error);
    }
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    const customerCount = await prisma.customer.count();
    const accountCount = await prisma.account.count();
    const transactionCount = await prisma.transaction.count();
    
    const endTime = Date.now();
    const durationMinutes = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
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