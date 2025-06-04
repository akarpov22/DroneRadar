import { MutationResolvers } from "../../../generated/schema";

export const assignModel: MutationResolvers['assignModel'] = async (_, { input }, { prisma }) => {
  const { droneId, modelId } = input;

  const drone = await prisma.drone.findUnique({
    where: { serial: droneId },
  });

  if (!drone) {
    throw new Error("Drone with this serial number not found.");
  }

  const updated = await prisma.drone.update({
     where: { id: drone.id },
    data: { modelId },
  });

  return updated;
  }