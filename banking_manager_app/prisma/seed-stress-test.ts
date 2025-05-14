import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import cliProgress from 'cli-progress';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;
const TOTAL_CUSTOMERS = 100000;
const ACCOUNTS_PER_CUSTOMER_MIN = 1;
const ACCOUNTS_PER_CUSTOMER_MAX = 3;
const TRANSACTIONS_PER_ACCOUNT_MIN = 1;
const TRANSACTIONS_PER_ACCOUNT_MAX = 10;
const MAX_RETRIES = 3;
const NUM_WORKERS = Math.max(1, cpus().length - 1);

async function retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.log(`Operation failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
}

async function generateCustomers(count: number, progressBar: cliProgress.SingleBar) {
  const batches = Math.ceil(count / BATCH_SIZE);
  
  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(BATCH_SIZE, count - i * BATCH_SIZE);
    const customers = Array.from({ length: batchSize }, () => ({
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      dob: faker.date.past({ years: 50 }),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent()
    }));

    await retryOperation(async () => {
      await prisma.customer.createMany({
        data: customers,
        skipDuplicates: true
      });
    });

    progressBar.update((i + 1) * BATCH_SIZE);
  }
}

type WorkerResult = {
  accounts?: Prisma.AccountCreateManyInput[];
  transactions?: Prisma.TransactionCreateManyInput[];
  error?: string;
};

// Worker thread function for generating accounts or transactions
if (!isMainThread) {
  async function workerMain() {
    const { type, data } = workerData as { type: 'accounts' | 'transactions', data: string[] };
    
    async function generateAccountsWorker(customerIds: string[]): Promise<Prisma.AccountCreateManyInput[]> {
      const accounts: Prisma.AccountCreateManyInput[] = [];
      for (const customerId of customerIds) {
        const accountCount = faker.number.int({
          min: ACCOUNTS_PER_CUSTOMER_MIN,
          max: ACCOUNTS_PER_CUSTOMER_MAX
        });

        accounts.push(...Array.from({ length: accountCount }, () => ({
          id: faker.string.uuid(),
          accountType: faker.helpers.arrayElement(['SAVINGS', 'CHECKING', 'CREDIT']),
          balance: Number(faker.number.float({ min: 100, max: 100000, fractionDigits: 2 })),
          customerId,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent()
        })));
      }
      return accounts;
    }

    async function generateTransactionsWorker(accountIds: string[]): Promise<Prisma.TransactionCreateManyInput[]> {
      const transactions: Prisma.TransactionCreateManyInput[] = [];
      for (const accountId of accountIds) {
        const transactionCount = faker.number.int({
          min: TRANSACTIONS_PER_ACCOUNT_MIN,
          max: TRANSACTIONS_PER_ACCOUNT_MAX
        });

        transactions.push(...Array.from({ length: transactionCount }, () => {
          const amount = Number(faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }));
          const type = faker.helpers.arrayElement(['DEPOSIT', 'WITHDRAWAL']);
          
          return {
            id: faker.string.uuid(),
            amount,
            type,
            accountId,
            createdAt: faker.date.past(),
            description: faker.finance.transactionDescription()
          };
        }));
      }
      return transactions;
    }

    try {
      const result = type === 'accounts' 
        ? { accounts: await generateAccountsWorker(data) }
        : { transactions: await generateTransactionsWorker(data) };
      parentPort?.postMessage(result);
    } catch (error) {
      if (error instanceof Error) {
        parentPort?.postMessage({ error: error.message });
      } else {
        parentPort?.postMessage({ error: 'Unknown error occurred' });
      }
    }
  }

  workerMain().catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}

async function runWorkers<T extends 'accounts' | 'transactions'>(
  type: T,
  data: string[]
): Promise<T extends 'accounts' ? Prisma.AccountCreateManyInput[] : Prisma.TransactionCreateManyInput[]> {
  const chunkSize = Math.ceil(data.length / NUM_WORKERS);
  const workers: Promise<WorkerResult>[] = [];

  for (let i = 0; i < NUM_WORKERS; i++) {
    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;

    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { type, data: chunk }
        });

        worker.on('message', (result: WorkerResult) => {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
      })
    );
  }

  const results = await Promise.all(workers);
  if (type === 'accounts') {
    return results.flatMap(result => result.accounts || []) as T extends 'accounts' 
      ? Prisma.AccountCreateManyInput[] 
      : Prisma.TransactionCreateManyInput[];
  } else {
    return results.flatMap(result => result.transactions || []) as T extends 'accounts'
      ? Prisma.AccountCreateManyInput[]
      : Prisma.TransactionCreateManyInput[];
  }
}

async function main() {
  console.log('Starting stress test data generation...');
  console.log(`Using ${NUM_WORKERS} worker threads for parallel processing`);
  
  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.customer.deleteMany();

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{bar} {percentage}% | {value}/{total} {task}'
  });

  console.time('Data generation');
  
  // Generate customers
  const customersBar = multibar.create(TOTAL_CUSTOMERS, 0, { task: 'Customers' });
  await generateCustomers(TOTAL_CUSTOMERS, customersBar);
  
  // Generate accounts in parallel
  const customerIds = await prisma.customer.findMany({ select: { id: true } });
  const accountsBar = multibar.create(customerIds.length, 0, { task: 'Accounts' });
  
  const accounts = await runWorkers('accounts', customerIds.map(c => c.id));
  await retryOperation(async () => {
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
      const batch = accounts.slice(i, i + BATCH_SIZE);
      await prisma.account.createMany({
        data: batch,
        skipDuplicates: true
      });
      accountsBar.update(Math.min(i + BATCH_SIZE, accounts.length));
    }
  });
  
  // Generate transactions in parallel
  const accountIds = await prisma.account.findMany({ select: { id: true } });
  const transactionsBar = multibar.create(accountIds.length, 0, { task: 'Transactions' });
  
  const transactions = await runWorkers('transactions', accountIds.map(a => a.id));
  await retryOperation(async () => {
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      await prisma.transaction.createMany({
        data: batch,
        skipDuplicates: true
      });
      transactionsBar.update(Math.min(i + BATCH_SIZE, transactions.length));
    }
  });
  
  multibar.stop();
  console.timeEnd('Data generation');
  console.log('Stress test data generation completed!');
}

if (isMainThread) {
  main()
    .catch((e) => {
      console.error('Error in stress test data generation:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} 