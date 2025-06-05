import { pubsub } from '../../context';

export const subscriptionResolvers = {
  droneUpdated: {
    subscribe: () => pubsub.asyncIterableIterator('DRONE_UPDATED'),
    resolve: (payload: any) => payload.droneUpdated,
  },
};