import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { gql, useQuery } from '@apollo/client';
import { Drone } from '../../utils/types';
import { MY_DRONES } from '../../utils/graphql-queries';

const ME = gql`
  query Me {
    me {
      role
    }
  }
`;

type DroneSelectionContextProps = {
  selectedDrone: Drone | undefined;
  setSelectedDrone: Dispatch<SetStateAction<undefined | Drone>>;
  showOnlyMine: boolean;
  setShowOnlyMine: Dispatch<SetStateAction<boolean>>;
  myDroneIds: ReadonlySet<string>;
  canManageDrones: boolean;
  isAdmin: boolean;
};

const DroneSelectionContext = createContext<DroneSelectionContextProps | null>(null);

export const DroneSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDrone, setSelectedDrone] = useState<Drone>();
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const { data: meData } = useQuery(ME);
  const role = meData?.me?.role;
  const isAdmin = role === 'ADMIN';
  const canManageDrones = role === 'ADMIN' || role === 'PILOT';

  const { data: myDronesData } = useQuery<{ myDrones: Drone[] }>(MY_DRONES, {
    skip: !canManageDrones,
  });

  const myDroneIds = useMemo(
    () => new Set((myDronesData?.myDrones ?? []).map((d) => d.id)),
    [myDronesData],
  );

  useEffect(() => {
    if (!showOnlyMine || !selectedDrone) return;
    if (!myDroneIds.has(selectedDrone.id)) {
      setSelectedDrone(undefined);
    }
  }, [showOnlyMine, selectedDrone, myDroneIds]);

  return (
    <DroneSelectionContext.Provider
      value={{
        selectedDrone,
        setSelectedDrone,
        showOnlyMine,
        setShowOnlyMine,
        myDroneIds,
        canManageDrones,
        isAdmin,
      }}
    >
      {children}
    </DroneSelectionContext.Provider>
  );
};

export const useDroneSelection = () => {
  const context = useContext(DroneSelectionContext);
  if (context === undefined || context === null) {
    throw new Error('useDroneSelection must be used within a DroneProvider');
  }
  return context;
};
