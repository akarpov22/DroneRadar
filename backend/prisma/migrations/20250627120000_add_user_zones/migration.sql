-- CreateEnum
CREATE TYPE "UserZoneShape" AS ENUM ('POLYGON', 'RECTANGLE', 'CIRCLE');

-- CreateTable
CREATE TABLE "UserZone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "shapeType" "UserZoneShape" NOT NULL,
    "geometry" JSONB NOT NULL,
    "west" DOUBLE PRECISION NOT NULL,
    "south" DOUBLE PRECISION NOT NULL,
    "east" DOUBLE PRECISION NOT NULL,
    "north" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserZone_userId_idx" ON "UserZone"("userId");

-- AddForeignKey
ALTER TABLE "UserZone" ADD CONSTRAINT "UserZone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
