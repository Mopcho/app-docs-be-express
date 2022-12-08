/*
  Warnings:

  - You are about to drop the column `userId` on the `Space` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `Space` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_userId_fkey";

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "userId",
ADD COLUMN     "ownerId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
