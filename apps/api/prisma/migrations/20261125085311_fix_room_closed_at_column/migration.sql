/*
  Warnings:

  - You are about to drop the column `closed_at` on the `invite_links` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invite_links" DROP COLUMN "closed_at";

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "closed_at" TIMESTAMPTZ(6);
