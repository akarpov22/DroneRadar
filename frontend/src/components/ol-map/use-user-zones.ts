import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { ME, USER_ZONES } from '../../utils/graphql-queries';
import {
  applyUserZoneFeatureProps,
  type UserZoneResult,
} from '../../utils/user-zones';
import { userZonesToFeatures } from './helpers';

export function useUserZones(interactionActive = false) {
  const [showUserZones, setShowUserZones] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [userZonesSource] = useState<VectorSource<Feature<Geometry>>>(
    () => new VectorSource({ features: [] }),
  );

  const { data: meData } = useQuery(ME, { fetchPolicy: 'cache-first' });
  const isPilot = meData?.me?.role === 'PILOT';

  const { data, loading, refetch } = useQuery(USER_ZONES, {
    skip: !isPilot,
    fetchPolicy: 'network-only',
  });

  const zones: UserZoneResult[] = data?.userZones ?? [];

  const refreshZones = useCallback(async () => {
    if (!isPilot) return;
    await refetch();
  }, [isPilot, refetch]);

  useEffect(() => {
    if (!showUserZones || !isPilot) {
      userZonesSource.clear();
      return;
    }
    if (interactionActive) return;

    userZonesSource.clear();
    userZonesSource.addFeatures(userZonesToFeatures(zones, selectedZoneId));
  }, [zones, showUserZones, isPilot, interactionActive, selectedZoneId, userZonesSource]);

  useEffect(() => {
    if (!showUserZones || !isPilot || interactionActive) return;

    for (const feature of userZonesSource.getFeatures()) {
      const zoneId = feature.get('userZoneId') as string;
      const zone = zones.find((z) => z.id === zoneId);
      if (zone) {
        applyUserZoneFeatureProps(feature, zone, zoneId === selectedZoneId);
      }
    }
  }, [selectedZoneId, zones, showUserZones, isPilot, interactionActive, userZonesSource]);

  return {
    isPilot,
    zones,
    zonesLoading: loading,
    showUserZones,
    setShowUserZones,
    selectedZoneId,
    setSelectedZoneId,
    userZonesSource,
    refreshZones,
  };
}
