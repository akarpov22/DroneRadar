import { MutationResolvers } from "../../../generated/schema";

export const registerDroneIfNotExists: MutationResolvers['registerDroneIfNotExists'] = async (_, { input }, { prisma }) => {
      const { serial, name, regionCode, modelId, operatorId } = input;
  
      let drone = await prisma.drone.findUnique({ where: { serial } });
  
      if (!drone) {
        drone = await prisma.drone.create({
          data: {
            serial,
            name,
            modelId,
            operatorId
          },
        });
      }
  
      const region = await prisma.region.findUnique({ where: { regionCode } });
      if (!region) {
        throw new Error("Region not found");
      }
  
      const activeSession = await prisma.droneSession.findFirst({
        where: {
          droneId: drone.id,
          endedAt: null,
        },
      });
  
      if (!activeSession) {
        await prisma.droneSession.create({
          data: {
            droneId: drone.id,
            regionId: region.id,
          },
        });
      }
  
      return drone;
    
  }