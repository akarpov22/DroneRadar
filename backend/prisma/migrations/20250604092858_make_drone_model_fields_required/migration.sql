/*
  Warnings:

  - Made the column `manufacturer` on table `DroneModel` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maxRange` on table `DroneModel` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DroneModel" ALTER COLUMN "manufacturer" SET NOT NULL,
ALTER COLUMN "maxRange" SET NOT NULL;
