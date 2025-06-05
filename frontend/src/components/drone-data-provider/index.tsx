import React, { createContext, useContext, useState, useEffect } from 'react';
import { gql, useSubscription } from '@apollo/client';

export type Region = {
    id: string;
    name: string;
    regionCode: string;
  };

  export type Position = {
    id: string
    altitude: number | null;
    latitude: number;
    longitude: number;
    recordedAt: string
    speed: number | null;
    heading: number | null;
  };
  

export type Session = {
    id: string
    startedAt: string
    endedAt: string | null;
    // region: Region
    positions: Position[]
}

export type Drone = {
    id: string;
    name: string;
    serial: string | null;
    model: string;
    operator: string;
    createdAt: string;
    sessions: Session[]
  };
  

const DRONE_UPDATED = gql`
  subscription {
    droneUpdated {
      id
      name
      serial

      sessions {
        id
        startedAt
        endedAt

        positions {
            id
            altitude
            latitude
            longitude
            recordedAt
            speed
            heading
        }
    }
      createdAt
    }
  }
`;

const DroneContext = createContext<Drone[]>([]);

export const DroneDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data } = useSubscription<{ droneUpdated: Drone }>(DRONE_UPDATED);
  const [drones, setDrone] = useState<Drone[]>([]);

  useEffect(() => {
    if (data?.droneUpdated) {
        const updatedDrones = drones.filter(drone => drone.id !== data.droneUpdated.id).concat(data.droneUpdated)
      setDrone(updatedDrones);
    }
  }, [data]);

  return (
    <DroneContext.Provider value={drones}>
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
