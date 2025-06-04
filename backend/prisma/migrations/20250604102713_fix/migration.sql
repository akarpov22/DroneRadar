-- DropForeignKey
ALTER TABLE "Drone" DROP CONSTRAINT "Drone_modelId_fkey";

-- DropForeignKey
ALTER TABLE "Drone" DROP CONSTRAINT "Drone_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "DroneSession" DROP CONSTRAINT "DroneSession_droneId_fkey";

-- DropForeignKey
ALTER TABLE "DroneSession" DROP CONSTRAINT "DroneSession_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Position" DROP CONSTRAINT "Position_sessionId_fkey";
