-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PILOT', 'OBSERVER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "auth0Sub" TEXT NOT NULL,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OBSERVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- AlterTable
ALTER TABLE "Drone" ADD COLUMN "pilotId" TEXT;
ALTER TABLE "Drone" ADD COLUMN "deviceTokenHash" TEXT;

-- AddForeignKey
ALTER TABLE "Drone" ADD CONSTRAINT "Drone_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Notify client-server when a new position is inserted
CREATE OR REPLACE FUNCTION notify_drone_position()
RETURNS TRIGGER AS $$
DECLARE
  v_drone_id TEXT;
BEGIN
  SELECT ds."droneId" INTO v_drone_id
  FROM "DroneSession" ds
  WHERE ds.id = NEW."sessionId";

  IF v_drone_id IS NOT NULL THEN
    PERFORM pg_notify(
      'drone_updated',
      json_build_object('droneId', v_drone_id)::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER position_notify_drone_updated
AFTER INSERT ON "Position"
FOR EACH ROW
EXECUTE FUNCTION notify_drone_position();
