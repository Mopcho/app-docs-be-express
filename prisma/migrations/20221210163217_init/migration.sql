/*
  Warnings:

  - You are about to drop the column `spaceId` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `auth0Id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `seededUser` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `Space` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Spaces` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "_Spaces" DROP CONSTRAINT "_Spaces_A_fkey";

-- DropForeignKey
ALTER TABLE "_Spaces" DROP CONSTRAINT "_Spaces_B_fkey";

-- DropIndex
DROP INDEX "user_auth0Id_key";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "spaceId";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "auth0Id",
DROP COLUMN "seededUser";

-- DropTable
DROP TABLE "Space";

-- DropTable
DROP TABLE "_Spaces";
