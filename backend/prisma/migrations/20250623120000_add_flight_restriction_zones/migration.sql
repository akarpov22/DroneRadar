-- CreateTable
CREATE TABLE "FlightRestrictionZone" (
    "externalId" TEXT NOT NULL,
    "sourceLayer" TEXT NOT NULL,
    "layerType" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "lowerLimit" TEXT,
    "upperLimit" TEXT,
    "validFrom" TEXT,
    "validTo" TEXT,
    "geometry" JSONB NOT NULL,
    "west" DOUBLE PRECISION NOT NULL,
    "south" DOUBLE PRECISION NOT NULL,
    "east" DOUBLE PRECISION NOT NULL,
    "north" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightRestrictionZone_pkey" PRIMARY KEY ("externalId")
);

-- CreateIndex
CREATE INDEX "FlightRestrictionZone_layerType_idx" ON "FlightRestrictionZone"("layerType");

-- CreateIndex
CREATE INDEX "FlightRestrictionZone_west_east_south_north_idx" ON "FlightRestrictionZone"("west", "east", "south", "north");
