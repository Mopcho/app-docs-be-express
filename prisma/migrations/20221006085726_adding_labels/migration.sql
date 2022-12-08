-- CreateTable
CREATE TABLE "label" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Label',
    "color" TEXT NOT NULL DEFAULT 'rgba(19, 255, 0, 1)',
    "fileId" UUID,

    CONSTRAINT "label_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "label_id_key" ON "label"("id");

-- AddForeignKey
ALTER TABLE "label" ADD CONSTRAINT "label_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label" ADD CONSTRAINT "label_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
