import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting admin user...');
  
  // Check if admin user exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@bankingapp.com' },
    include: { customer: true }
  });

  if (!existingAdmin) {
    console.log('Admin user does not exist.');
    return;
  }

  // Use a transaction to ensure everything gets deleted properly
  await prisma.$transaction(async (tx) => {
    // Delete associated activity logs first
    console.log('Deleting associated activity logs...');
    await tx.activityLog.deleteMany({
      where: { userId: existingAdmin.id }
    });

    // Delete associated customer if exists
    if (existingAdmin.customer) {
      console.log('Deleting associated customer record...');
      await tx.customer.delete({
        where: { id: existingAdmin.customer.id }
      });
    }

    // Delete admin user
    console.log('Deleting admin user record...');
    await tx.user.delete({
      where: { id: existingAdmin.id }
    });
  });

  console.log('Admin user successfully deleted.');
}

main()
  .catch((e) => {
    console.error('Error deleting admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 