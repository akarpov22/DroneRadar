import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { DRONE_MODELS, DRONE_UPDATED } from '../../utils/graphql-queries';
import { Drone, Model } from '../../utils/types';

  
const DroneContext = createContext<{ drones: Drone[], models: Model[]}>({ drones: [], models: []});

export const DroneDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data } = useSubscription<{ droneUpdated: Drone }>(DRONE_UPDATED);

  const { data: droneModels } = useQuery<{ droneModels: Model[] }>(DRONE_MODELS);

  const [drones, setDrone] = useState<Drone[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    if (data?.droneUpdated) {
        const updatedDrones = drones.filter(drone => drone.id !== data.droneUpdated.id).concat(data.droneUpdated)
      setDrone(updatedDrones);
    }
  }, [data]);

  useEffect(() => {
    if (droneModels?.droneModels) 
      setModels(droneModels?.droneModels);
  }, [droneModels]);

  return (
    <DroneContext.Provider value={{drones, models}}>
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
