import { UserRole } from '@prisma/client';
import { AlertStatus } from '../../../generated/schema';
import { getAlertStatus } from "../../../services/drone-alert-service";
import { DroneResolvers } from "../../../generated/schema";

export const droneResolvers: DroneResolvers = {
    id: (parent) => parent.id,
    name: (parent) => parent.name,
    serial: (parent) => parent.serial ?? null,
    model: (parent, _, {prisma}) => parent.modelId ? prisma.droneModel.findUnique({where:{id: parent.modelId}}) : null,
    operator: (parent, _, {prisma}) =>  parent.operatorId ? prisma.operator.findUnique({where:{id: parent.operatorId}}) : null,
    pilot: (parent, _, { prisma }) =>
        parent.pilotId ? prisma.user.findUnique({ where: { id: parent.pilotId } }) : null,
    alertStatus: (parent) => {
      if ('alertStatus' in parent && parent.alertStatus) {
        return parent.alertStatus as AlertStatus;
      }
      return getAlertStatus(parent.id);
    },
    sessions: (parent, _, { prisma }) => {
      if ('sessions' in parent && Array.isArray(parent.sessions)) {
        return parent.sessions;
      }
      return prisma.droneSession.findMany({
        where: { droneId: parent.id },
        orderBy: { startedAt: 'asc' },
      });
    },
    createdAt: (parent) => parent.createdAt,
}
