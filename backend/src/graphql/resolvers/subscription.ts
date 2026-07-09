import { ForbiddenError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import { UserRole } from '@prisma/client';
import { pubsub } from '../../context';
import {
  canUserSeeDroneNotification,
  DroneNotificationPayload,
} from '../../services/drone-alert-service';

function requireAlertSubscriber(ctx: { user: { id: string; role: UserRole } | null }) {
  if (!ctx.user) {
    throw new ForbiddenError('Authentication required');
  }
  if (ctx.user.role === UserRole.OBSERVER) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

export const subscriptionResolvers = {
  droneUpdated: {
    subscribe: () => pubsub.asyncIterableIterator('DRONE_UPDATED'),
    resolve: (payload: { droneUpdated: unknown }) => payload.droneUpdated,
  },
  droneNotification: {
    subscribe: withFilter(
      () => pubsub.asyncIterableIterator('DRONE_ALERT'),
      (payload, _variables, ctx) => {
        if (!payload?.droneNotification) return false;
        requireAlertSubscriber(ctx);
        return canUserSeeDroneNotification(
          payload.droneNotification as DroneNotificationPayload,
          ctx.user!.id,
          ctx.user!.role,
        );
      },
    ),
    resolve: (payload: { droneNotification: DroneNotificationPayload }) =>
      payload.droneNotification,
  },
};
