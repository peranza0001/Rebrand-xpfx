import process from 'node:process';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log('Post-migration check passed:', result);
  } catch (error) {
    console.error('Post-migration check failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
