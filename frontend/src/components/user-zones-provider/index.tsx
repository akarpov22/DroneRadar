import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import type OpenLayersMap from 'ol/Map';
import { useUserZones } from '../ol-map/use-user-zones';
import { useUserZoneDraw } from '../ol-map/use-user-zone-draw';

type UserZonesContextValue = ReturnType<typeof useUserZones> & ReturnType<typeof useUserZoneDraw> & {
  map: OpenLayersMap | null;
  setMap: (map: OpenLayersMap | null) => void;
};

const UserZonesContext = createContext<UserZonesContextValue | null>(null);

export const UserZonesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [map, setMap] = useState<OpenLayersMap | null>(null);
  const [zoneInteractionActive, setZoneInteractionActive] = useState(false);

  const zonesState = useUserZones(zoneInteractionActive);

  const draw = useUserZoneDraw({
    map,
    userZonesSource: zonesState.userZonesSource,
    isPilot: zonesState.isPilot,
    selectedZoneId: zonesState.selectedZoneId,
    setSelectedZoneId: zonesState.setSelectedZoneId,
    onZonesChange: zonesState.refreshZones,
    onInteractionActiveChange: setZoneInteractionActive,
  });

  const value = useMemo<UserZonesContextValue>(
    () => ({
      ...zonesState,
      ...draw,
      map,
      setMap,
    }),
    [zonesState, draw, map],
  );

  return (
    <UserZonesContext.Provider value={value}>
      {children}
    </UserZonesContext.Provider>
  );
};

export function useUserZonesContext(): UserZonesContextValue {
  const context = useContext(UserZonesContext);
  if (!context) {
    throw new Error('useUserZonesContext must be used within UserZonesProvider');
  }
  return context;
}
