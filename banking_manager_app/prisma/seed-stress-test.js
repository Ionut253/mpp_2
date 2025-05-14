"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const worker_threads_1 = require("worker_threads");
const os_1 = require("os");
const cli_progress_1 = __importDefault(require("cli-progress"));
const prisma = new client_1.PrismaClient();
const BATCH_SIZE = 1000;
const TOTAL_CUSTOMERS = 100000;
const ACCOUNTS_PER_CUSTOMER_MIN = 1;
const ACCOUNTS_PER_CUSTOMER_MAX = 3;
const TRANSACTIONS_PER_ACCOUNT_MIN = 1;
const TRANSACTIONS_PER_ACCOUNT_MAX = 10;
const MAX_RETRIES = 3;
const NUM_WORKERS = Math.max(1, (0, os_1.cpus)().length - 1);
async function retryOperation(operation, retries = MAX_RETRIES) {
    try {
        return await operation();
    }
    catch (error) {
        if (retries > 0) {
            console.log(`Operation failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return retryOperation(operation, retries - 1);
        }
        throw error;
    }
}
async function generateCustomers(count, progressBar) {
    const batches = Math.ceil(count / BATCH_SIZE);
    for (let i = 0; i < batches; i++) {
        const batchSize = Math.min(BATCH_SIZE, count - i * BATCH_SIZE);
        const customers = Array.from({ length: batchSize }, () => ({
            id: faker_1.faker.string.uuid(),
            firstName: faker_1.faker.person.firstName(),
            lastName: faker_1.faker.person.lastName(),
            email: faker_1.faker.internet.email(),
            phone: faker_1.faker.phone.number(),
            address: faker_1.faker.location.streetAddress(),
            dob: faker_1.faker.date.past({ years: 50 }),
            createdAt: faker_1.faker.date.past(),
            updatedAt: faker_1.faker.date.recent()
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
// Worker thread function for generating accounts or transactions
if (!worker_threads_1.isMainThread) {
    async function workerMain() {
        const { type, data } = worker_threads_1.workerData;
        async function generateAccountsWorker(customerIds) {
            const accounts = [];
            for (const customerId of customerIds) {
                const accountCount = faker_1.faker.number.int({
                    min: ACCOUNTS_PER_CUSTOMER_MIN,
                    max: ACCOUNTS_PER_CUSTOMER_MAX
                });
                accounts.push(...Array.from({ length: accountCount }, () => ({
                    id: faker_1.faker.string.uuid(),
                    accountType: faker_1.faker.helpers.arrayElement(['SAVINGS', 'CHECKING', 'CREDIT']),
                    balance: Number(faker_1.faker.number.float({ min: 100, max: 100000, fractionDigits: 2 })),
                    customerId,
                    createdAt: faker_1.faker.date.past(),
                    updatedAt: faker_1.faker.date.recent()
                })));
            }
            return accounts;
        }
        async function generateTransactionsWorker(accountIds) {
            const transactions = [];
            for (const accountId of accountIds) {
                const transactionCount = faker_1.faker.number.int({
                    min: TRANSACTIONS_PER_ACCOUNT_MIN,
                    max: TRANSACTIONS_PER_ACCOUNT_MAX
                });
                transactions.push(...Array.from({ length: transactionCount }, () => {
                    const amount = Number(faker_1.faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }));
                    const type = faker_1.faker.helpers.arrayElement(['DEPOSIT', 'WITHDRAWAL']);
                    return {
                        id: faker_1.faker.string.uuid(),
                        amount,
                        type,
                        accountId,
                        createdAt: faker_1.faker.date.past(),
                        description: faker_1.faker.finance.transactionDescription()
                    };
                }));
            }
            return transactions;
        }
        try {
            const result = type === 'accounts'
                ? { accounts: await generateAccountsWorker(data) }
                : { transactions: await generateTransactionsWorker(data) };
            worker_threads_1.parentPort?.postMessage(result);
        }
        catch (error) {
            if (error instanceof Error) {
                worker_threads_1.parentPort?.postMessage({ error: error.message });
            }
            else {
                worker_threads_1.parentPort?.postMessage({ error: 'Unknown error occurred' });
            }
        }
    }
    workerMain().catch(error => {
        console.error('Worker error:', error);
        process.exit(1);
    });
}
async function runWorkers(type, data) {
    const chunkSize = Math.ceil(data.length / NUM_WORKERS);
    const workers = [];
    for (let i = 0; i < NUM_WORKERS; i++) {
        const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
        if (chunk.length === 0)
            continue;
        workers.push(new Promise((resolve, reject) => {
            const worker = new worker_threads_1.Worker(__filename, {
                workerData: { type, data: chunk }
            });
            worker.on('message', (result) => {
                if (result.error) {
                    reject(new Error(result.error));
                }
                else {
                    resolve(result);
                }
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0)
                    reject(new Error(`Worker stopped with exit code ${code}`));
            });
        }));
    }
    const results = await Promise.all(workers);
    if (type === 'accounts') {
        return results.flatMap(result => result.accounts || []);
    }
    else {
        return results.flatMap(result => result.transactions || []);
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
    const multibar = new cli_progress_1.default.MultiBar({
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
if (worker_threads_1.isMainThread) {
    main()
        .catch((e) => {
        console.error('Error in stress test data generation:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
