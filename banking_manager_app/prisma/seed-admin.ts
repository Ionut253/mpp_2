import { PrismaClient } from '../src/generated/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@bankingapp.com' }
  });

  if (existingAdmin) {
    console.log('Admin user already exists.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@bankingapp.com',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log(`\nAdmin user created successfully!`);
  console.log('-----------------------------------');
  console.log(`ID: ${adminUser.id}`);
  console.log(`Email: ${adminUser.email}`);
  console.log(`Role: ${adminUser.role}`);
  console.log(`Password: admin123`);
  console.log('-----------------------------------');
  console.log('You can now log in with these credentials.');
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 