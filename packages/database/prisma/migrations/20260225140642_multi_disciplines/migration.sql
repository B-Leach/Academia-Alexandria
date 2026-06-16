/*
  Warnings:

  - You are about to drop the column `discipline` on the `papers` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "papers_discipline_idx";

-- AlterTable
ALTER TABLE "papers" DROP COLUMN "discipline",
ADD COLUMN     "disciplines" TEXT[];
