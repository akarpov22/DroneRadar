import { useState, useCallback, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import type OpenLayersMap from 'ol/Map';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { toLonLat } from 'ol/proj';
import { FLIGHT_RESTRICTION_ZONES } from '../../utils/graphql-queries';
import {
  DEFAULT_ZONE_FILTERS,
  type ZoneFilters,
  type ZoneFilterType,
} from '../../utils/flight-zones';
import { zonesToFeatures } from './helpers';
import {
  MAX_BBOX_SPAN,
  MIN_ZOOM_FOR_ZONES,
  MOVEEND_DEBOUNCE_MS,
  type FlightRestrictionZoneResult,
} from './types';

export function useFlightZones() {
  const [map, setMap] = useState<OpenLayersMap | null>(null);
  const [showFlightZones, setShowFlightZones] = useState(true);
  const [zoneFilters, setZoneFilters] = useState<ZoneFilters>(DEFAULT_ZONE_FILTERS);
  const [zonesCache, setZonesCache] = useState<FlightRestrictionZoneResult[]>([]);
  const [zoneTooltip, setZoneTooltip] = useState<string | null>(null);
  const [zonesSource] = useState<VectorSource<Feature<Geometry>>>(
    () => new VectorSource({ features: [] }),
  );

  const [fetchZones, { loading: zonesLoading }] = useLazyQuery(FLIGHT_RESTRICTION_ZONES, {
    fetchPolicy: 'network-only',
    onCompleted: (data: { flightRestrictionZones?: FlightRestrictionZoneResult[] | null }) => {
      setZonesCache(data.flightRestrictionZones ?? []);
    },
  });

  const fetchZonesForViewport = useCallback((includeNotam: boolean) => {
    if (!map || !showFlightZones) return;

    const zoom = map.getView().getZoom() ?? 0;
    if (zoom < MIN_ZOOM_FOR_ZONES) {
      zonesSource.clear();
      return;
    }

    const extent = map.getView().calculateExtent(map.getSize());
    const [west, south] = toLonLat([extent[0], extent[1]]);
    const [east, north] = toLonLat([extent[2], extent[3]]);
    const bboxSpan = Math.max(Math.abs(east - west), Math.abs(north - south));

    if (bboxSpan > MAX_BBOX_SPAN) {
      zonesSource.clear();
      return;
    }

    fetchZones({
      variables: { west, south, east, north, includeNotam },
    });
  }, [fetchZones, map, showFlightZones, zonesSource]);

  const loadZonesForViewport = useCallback(() => {
    fetchZonesForViewport(zoneFilters.NOTAM);
  }, [fetchZonesForViewport, zoneFilters.NOTAM]);

  const toggleZoneFilter = (type: ZoneFilterType) => {
    const enablingNotam = type === 'NOTAM' && !zoneFilters.NOTAM;
    setZoneFilters((prev) => ({ ...prev, [type]: !prev[type] }));
    if (showFlightZones && enablingNotam) {
      fetchZonesForViewport(true);
    }
  };

  useEffect(() => {
    if (!showFlightZones) {
      zonesSource.clear();
      setZoneTooltip(null);
      return;
    }
    zonesSource.clear();
    zonesSource.addFeatures(zonesToFeatures(zonesCache, zoneFilters));
  }, [zonesCache, zoneFilters, showFlightZones, zonesSource]);

  useEffect(() => {
    if (!map || !showFlightZones) return;

    let debounceId: ReturnType<typeof setTimeout>;
    const onMoveEnd = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(loadZonesForViewport, MOVEEND_DEBOUNCE_MS);
    };

    map.on('moveend', onMoveEnd);
    return () => {
      clearTimeout(debounceId);
      map.un('moveend', onMoveEnd);
    };
  }, [map, showFlightZones, loadZonesForViewport]);

  useEffect(() => {
    if (map && showFlightZones) {
      loadZonesForViewport();
    }
  }, [map, showFlightZones, loadZonesForViewport]);

  return {
    zonesSource,
    setMap,
    showFlightZones,
    setShowFlightZones,
    zoneFilters,
    toggleZoneFilter,
    zonesLoading,
    zoneTooltip,
    setZoneTooltip,
  };
}
