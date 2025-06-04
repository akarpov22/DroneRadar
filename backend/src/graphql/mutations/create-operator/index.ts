import { MutationResolvers } from "../../../generated/schema";

export const createOperator: MutationResolvers['createOperator'] = async (_, { input }, { prisma }) => {
  const { name, licenseId } = input;
  
  const operator = await prisma.operator.create({
    data: { name, licenseId },
  });

  return operator;
  }