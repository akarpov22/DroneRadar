import React, { useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import 'ol/ol.css';
import type OpenLayersMap from 'ol/Map';
import { useDroneSelection } from '../drone-selection-provider';
import type { Drone } from '../../utils/types';
import { ZoneFiltersPanel } from './zone-filters-panel';
import { ZoneTooltip } from './zone-tooltip';
import { UserZoneTooltip } from './user-zone-tooltip';
import { useFlightZones } from './use-flight-zones';
import { useDroneLayers } from './use-drone-layers';
import { useOlMapInit } from './use-ol-map-init';
import { useUserZonesContext } from '../user-zones-provider';

export const OlMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const { selectedDrone, setSelectedDrone, isDisplayOwned } = useDroneSelection();

  const {
    zones: userZones,
    showUserZones,
    selectedZoneId,
    setSelectedZoneId,
    userZonesSource,
    setMap,
    interactionActive,
    isEditing,
    saving,
    startEdit,
    saveEdit,
    cancelDraw,
    removeZone,
    openRenameZone,
  } = useUserZonesContext();

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
    setMap: setFlightZonesMap,
    showFlightZones,
    setShowFlightZones,
    zoneFilters,
    toggleZoneFilter,
    zonesLoading,
    zoneTooltip,
    setZoneTooltip,
  } = useFlightZones();

  const handleMapReady = useCallback((olMap: OpenLayersMap | null) => {
    setMap(olMap);
    setFlightZonesMap(olMap);
  }, [setMap, setFlightZonesMap]);

  useOlMapInit({
    mapRef,
    zonesSource,
    userZonesSource,
    droneSource,
    dronePathSource,
    onSelectDrone: handleSelectDrone,
    onZoneTooltip: setZoneTooltip,
    onUserZoneSelect: setSelectedZoneId,
    onMapReady: handleMapReady,
    mapInteractionsEnabled: !interactionActive,
  });

  const selectedUserZone = userZones.find((z) => z.id === selectedZoneId) ?? null;

  return (
    <Box position="relative" w="100%" h="100%">
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

      {selectedUserZone && showUserZones && (
        <UserZoneTooltip
          zone={selectedUserZone}
          zones={userZones}
          isEditing={isEditing}
          saving={saving}
          onRename={() => openRenameZone(selectedUserZone.id)}
          onEdit={() => startEdit(selectedUserZone.id)}
          onDelete={() => removeZone(selectedUserZone.id)}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelDraw}
          onClose={() => setSelectedZoneId(null)}
        />
      )}
    </Box>
  );
};
