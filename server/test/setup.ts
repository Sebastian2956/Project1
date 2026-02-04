import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "MatchSnapshot" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Swipe" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "SessionDeckItem" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "SessionMember" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Session" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Place" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "MagicLinkToken" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RefreshToken" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
}
