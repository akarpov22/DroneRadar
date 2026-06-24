import React, { useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import 'ol/ol.css';
import { useDroneSelection } from '../drone-selection-provider';
import type { Drone } from '../../utils/types';
import { ZoneFiltersPanel } from './zone-filters-panel';
import { ZoneTooltip } from './zone-tooltip';
import { useFlightZones } from './use-flight-zones';
import { useDroneLayers } from './use-drone-layers';
import { useOlMapInit } from './use-ol-map-init';

export const OlMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const { selectedDrone, setSelectedDrone, isDisplayOwned } = useDroneSelection();

  const { droneSource, dronePathSource } = useDroneLayers(
    isDisplayOwned,
    selectedDrone?.id,
  );

  const handleSelectDrone = useCallback(
    (drone: Drone | undefined) => setSelectedDrone(drone),
    [setSelectedDrone],
  );

  const {
    zonesSource,
    setMap,
    showFlightZones,
    setShowFlightZones,
    zoneFilters,
    toggleZoneFilter,
    zonesLoading,
    zoneTooltip,
    setZoneTooltip,
  } = useFlightZones();

  useOlMapInit({
    mapRef,
    zonesSource,
    droneSource,
    dronePathSource,
    onSelectDrone: handleSelectDrone,
    onZoneTooltip: setZoneTooltip,
    onMapReady: setMap,
  });

  return (
    <Box position="relative" w="100%" h="100vh">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      <ZoneFiltersPanel
        showFlightZones={showFlightZones}
        onShowFlightZonesChange={setShowFlightZones}
        zoneFilters={zoneFilters}
        onToggleZoneFilter={toggleZoneFilter}
        zonesLoading={zonesLoading}
      />

      {zoneTooltip && (
        <ZoneTooltip text={zoneTooltip} onClose={() => setZoneTooltip(null)} />
      )}
    </Box>
  );
};
