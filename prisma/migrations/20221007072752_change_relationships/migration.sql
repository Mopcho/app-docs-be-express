/*
  Warnings:

  - You are about to drop the column `fileId` on the `label` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "label" DROP CONSTRAINT "label_fileId_fkey";

-- AlterTable
ALTER TABLE "label" DROP COLUMN "fileId";

-- CreateTable
CREATE TABLE "_FileToLabel" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_FileToLabel_AB_unique" ON "_FileToLabel"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToLabel_B_index" ON "_FileToLabel"("B");

-- AddForeignKey
ALTER TABLE "_FileToLabel" ADD CONSTRAINT "_FileToLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToLabel" ADD CONSTRAINT "_FileToLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
