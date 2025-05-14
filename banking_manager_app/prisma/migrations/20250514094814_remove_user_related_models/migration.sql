/*
  Warnings:

  - You are about to drop the column `userId` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonitoredUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "MonitoredUser" DROP CONSTRAINT "MonitoredUser_userId_fkey";

-- DropIndex
DROP INDEX "Customer_userId_idx";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "userId";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "MonitoredUser";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "AuditAction";

-- DropEnum
DROP TYPE "UserRole";
