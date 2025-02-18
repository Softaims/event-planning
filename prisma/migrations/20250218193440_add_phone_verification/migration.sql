-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerificationToken" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
