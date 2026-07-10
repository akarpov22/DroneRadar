import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { print } from 'graphql';
import { DRONES, DRONE_MODELS, DRONE_UPDATED } from '../../utils/graphql-queries';
import { getDroneLatestPosition, mergeDroneUpdate } from '../../utils/drone';
import { setDroneSnapshot } from '../../utils/drone-store';
import { SubscriptionClientContext } from '../../apollo-client';
import { Drone, Model } from '../../utils/types';

const DroneContext = createContext<{ models: Model[] }>({ models: [] });

function mergeQueryDronesWithLive(prev: Drone[], fromQuery: Drone[]): Drone[] {
  const byId = new Map(prev.map((drone) => [drone.id, drone]));

  const merged = fromQuery.map((queryDrone) => {
    const live = byId.get(queryDrone.id);
    if (!live) return queryDrone;

    const liveLatest = getDroneLatestPosition(live);
    const queryLatest = getDroneLatestPosition(queryDrone);
    const queryIsNewer = liveLatest && queryLatest
      && new Date(queryLatest.recordedAt) > new Date(liveLatest.recordedAt);

    return {
      ...queryDrone,
      model: queryDrone.model ?? live.model,
      alertStatus: queryDrone.alertStatus ?? live.alertStatus,
      sessions: queryIsNewer ? queryDrone.sessions : live.sessions,
    };
  });

  for (const live of prev) {
    if (!merged.some((drone) => drone.id === live.id)) {
      merged.push(live);
    }
  }

  return merged;
}

export const DroneDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsClient = useContext(SubscriptionClientContext);
  const dronesRef = useRef<Drone[]>([]);

  const syncSnapshot = useCallback((drones: Drone[]) => {
    dronesRef.current = drones;
    setDroneSnapshot(drones);
  }, []);

  const { data: dronesData } = useQuery<{ drones: Drone[] }>(DRONES, {
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (!dronesData?.drones) return;
    syncSnapshot(mergeQueryDronesWithLive(dronesRef.current, dronesData.drones));
  }, [dronesData, syncSnapshot]);

  useEffect(() => {
    if (!wsClient) return;

    const subscription = wsClient.request({ query: print(DRONE_UPDATED) }).subscribe({
      next: (result: { data?: { droneUpdated?: Drone } }) => {
        const incoming = result.data?.droneUpdated;
        if (!incoming) return;

        const next = mergeDroneUpdate(dronesRef.current, incoming);
        if (next === dronesRef.current) return;

        syncSnapshot(next);
      },
      error: (error: unknown) => {
        console.error('Drone subscription error:', error);
      },
    });

    return () => subscription.unsubscribe();
  }, [wsClient, syncSnapshot]);

  const [models, setModels] = useState<Model[]>([]);
  const { data: droneModels } = useQuery<{ droneModels: Model[] }>(DRONE_MODELS);

  useEffect(() => {
    if (droneModels?.droneModels) {
      setModels(droneModels.droneModels);
    }
  }, [droneModels]);

  const contextValue = useMemo(() => ({ models }), [models]);

  return (
    <DroneContext.Provider value={contextValue}>
      {children}
    </DroneContext.Provider>
  );
};

export const useDrones = () => {
  const context = useContext(DroneContext);
  if (context === undefined) {
    throw new Error('useDrone must be used within a DroneProvider');
  }
  return context;
};
