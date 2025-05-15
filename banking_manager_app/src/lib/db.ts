import { PrismaClient } from '../generated/client';

// Type augmentation for PrismaClient to ensure type safety
declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // In production, create a new instance
  prisma = new PrismaClient();
} else {
  // In development, reuse the connection to avoid too many connections
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient();
  }
  prisma = global.cachedPrisma;
}

export default prisma; 