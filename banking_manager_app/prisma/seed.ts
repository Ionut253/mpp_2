import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Function to generate simple phone numbers in (XXX) XXX-XXXX format
const generatePhoneNumber = () => {
  const areaCode = faker.number.int({ min: 100, max: 999 });
  const firstPart = faker.number.int({ min: 100, max: 999 });
  const secondPart = faker.number.int({ min: 1000, max: 9999 });
  return `(${areaCode}) ${firstPart}-${secondPart}`;
};

async function main() {
  // Clear existing data
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.customer.deleteMany()

  console.log('Creating 50 customers with accounts and transactions...')

  // Create 50 customers
  for (let i = 0; i < 50; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: generatePhoneNumber(),
        address: faker.location.streetAddress(true),
        accounts: {
          create: [
            // Create a checking account
            {
              accountType: 'CHECKING',
              balance: Number(faker.finance.amount({ min: 1000, max: 10000 })),
              transactions: {
                create: Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
                  type: faker.helpers.arrayElement(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
                  amount: Number(faker.finance.amount({ min: 50, max: 1000 })),
                  description: faker.finance.transactionDescription(),
                })),
              },
            },
            // Create a savings account
            {
              accountType: 'SAVINGS',
              balance: Number(faker.finance.amount({ min: 5000, max: 50000 })),
              transactions: {
                create: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => ({
                  type: faker.helpers.arrayElement(['DEPOSIT', 'WITHDRAWAL']),
                  amount: Number(faker.finance.amount({ min: 100, max: 5000 })),
                  description: faker.finance.transactionDescription(),
                })),
              },
            },
          ],
        },
      },
      include: {
        accounts: {
          include: {
            transactions: true,
          },
        },
      },
    })

    console.log(`Created customer ${i + 1}/50: ${customer.name} - ${customer.phone}`)
  }

  // Get final counts
  const customerCount = await prisma.customer.count()
  const accountCount = await prisma.account.count()
  const transactionCount = await prisma.transaction.count()

  console.log('\nSeeding completed successfully!')
  console.log(`Created ${customerCount} customers`)
  console.log(`Created ${accountCount} accounts`)
  console.log(`Created ${transactionCount} transactions`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 