/*
  Warnings:

  - You are about to drop the `_SpaceToUser` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Space` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_SpaceToUser" DROP CONSTRAINT "_SpaceToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_SpaceToUser" DROP CONSTRAINT "_SpaceToUser_B_fkey";

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "userId" UUID NOT NULL;

-- DropTable
DROP TABLE "_SpaceToUser";

-- CreateTable
CREATE TABLE "_Spaces" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Spaces_AB_unique" ON "_Spaces"("A", "B");

-- CreateIndex
CREATE INDEX "_Spaces_B_index" ON "_Spaces"("B");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Spaces" ADD CONSTRAINT "_Spaces_A_fkey" FOREIGN KEY ("A") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Spaces" ADD CONSTRAINT "_Spaces_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
