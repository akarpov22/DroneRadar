import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { Drone } from "../../utils/types";

type DroneSelectionContextProps = {
  selectedDrone: Drone | undefined,
  setSelectedDrone: Dispatch<SetStateAction<undefined | Drone>>,
  isDisplayOwned: boolean,
  setIsDisplayOwned: Dispatch<SetStateAction<boolean>>
}

const DroneSelectionContext = createContext<DroneSelectionContextProps | null>(null);

export const DroneSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDrone, setSelectedDrone] = useState<Drone>();
  const [isDisplayOwned, setIsDisplayOwned] = useState<boolean>(false);

  return (
    <DroneSelectionContext.Provider value={ {selectedDrone, setSelectedDrone, isDisplayOwned, setIsDisplayOwned} } >
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
