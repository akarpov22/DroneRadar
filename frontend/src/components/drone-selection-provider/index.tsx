import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { Drone } from "../drone-data-provider";

const DroneSelectionContext = createContext<{selectedDrone: Drone | undefined, setSelectedDrone: Dispatch<SetStateAction<undefined | Drone>>} | null>(null);

export const DroneSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDrone, setSelectedDrone] = useState<Drone>();

  return (
    <DroneSelectionContext.Provider value={ {selectedDrone, setSelectedDrone} } >
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
