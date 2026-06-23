import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { print } from 'graphql';
import { DRONES, DRONE_MODELS, DRONE_UPDATED } from '../../utils/graphql-queries';
import { mergeDroneUpdate } from '../../utils/drone';
import { setDroneSnapshot } from '../../utils/drone-store';
import { SubscriptionClientContext } from '../../apollo-client';
import { Drone, Model } from '../../utils/types';

const DroneContext = createContext<{ models: Model[] }>({ models: [] });

export const DroneDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsClient = useContext(SubscriptionClientContext);
  const dronesRef = useRef<Drone[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  useQuery<{ drones: Drone[] }>(DRONES, {
    onCompleted: (data) => {
      dronesRef.current = data.drones;
      setDroneSnapshot(dronesRef.current);
    },
  });

  useEffect(() => {
    if (!wsClient) return;

    const subscription = wsClient.request({ query: print(DRONE_UPDATED) }).subscribe({
      next: (result: { data?: { droneUpdated?: Drone } }) => {
        const incoming = result.data?.droneUpdated;
        if (!incoming) return;

        const next = mergeDroneUpdate(dronesRef.current, incoming);
        if (next === dronesRef.current) return;

        dronesRef.current = next;
        setDroneSnapshot(dronesRef.current);
      },
      error: (error: unknown) => {
        console.error('Drone subscription error:', error);
      },
    });

    return () => subscription.unsubscribe();
  }, [wsClient]);

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
