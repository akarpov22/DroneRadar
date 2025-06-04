import { MutationResolvers } from "../../../generated/schema";

export const assignOperator: MutationResolvers['assignOperator'] = async (_, { input }, { prisma }) => {
  const { droneId, operatorId } = input;

  const drone = await prisma.drone.findUnique({
    where: { id: droneId },
  });

  if (!drone) {
    throw new Error("Drone with this id number not found.");
  }

  const updated = await prisma.drone.update({
    where: { id: drone.id },
    data: { operatorId },
  });

  return updated;
  }