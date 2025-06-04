/*
  Warnings:

  - Made the column `serial` on table `Drone` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Drone" ALTER COLUMN "serial" SET NOT NULL,
ALTER COLUMN "operatorId" DROP NOT NULL;
