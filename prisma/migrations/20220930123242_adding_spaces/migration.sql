-- AlterTable
ALTER TABLE "File" ADD COLUMN     "spaceId" UUID;

-- CreateTable
CREATE TABLE "Space" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SpaceToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Space_id_key" ON "Space"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_SpaceToUser_AB_unique" ON "_SpaceToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SpaceToUser_B_index" ON "_SpaceToUser"("B");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpaceToUser" ADD CONSTRAINT "_SpaceToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpaceToUser" ADD CONSTRAINT "_SpaceToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
