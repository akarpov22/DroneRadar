import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Checkbox, Text, VStack } from '@chakra-ui/react';
import OpenLayersMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import 'ol/ol.css';
import { Feature } from 'ol';
import { Geometry, LineString, Point } from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getCurrentSession, getDroneLatestPosition } from '../../utils/drone';
import { getDroneSnapshot, subscribeDrones } from '../../utils/drone-store';
import Stroke from 'ol/style/Stroke';
import { useDroneSelection } from '../drone-selection-provider';
import { useLazyQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FLIGHT_RESTRICTION_ZONES } from '../../utils/graphql-queries';
import GeoJSON from 'ol/format/GeoJSON';
import {
  applyZoneFeatureProps,
  DEFAULT_ZONE_FILTERS,
  ZONE_FILTER_TYPES,
  type ZoneFilters,
  type ZoneFilterType,
} from '../../utils/flight-zones';
import type { Drone } from '../../utils/types';

interface FlightRestrictionZoneResult {
  id: string;
  layerType: string;
  name?: string | null;
  description?: string | null;
  lowerLimit?: string | null;
  upperLimit?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  geometry: object;
}

const ZONE_TYPE_I18N: Record<ZoneFilterType, string> = {
  CTR: 'flight-zone-type-ctr',
  RSTA: 'flight-zone-type-rsta',
  ATZ: 'flight-zone-type-atz',
  NOTAM: 'flight-zone-type-notam',
};

const geoJsonFormat = new GeoJSON();
const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;
const MIN_ZOOM_FOR_ZONES = 8;
const MAX_BBOX_SPAN = 2.5;
const DEFAULT_MAP_ZOOM = 9;
const MOVEEND_DEBOUNCE_MS = 500;

function zonesToFeatures(
  zones: FlightRestrictionZoneResult[],
  filters: ZoneFilters,
): Feature<Geometry>[] {
  return zones
    .filter((zone) => filters[zone.layerType as ZoneFilterType] ?? filters.RSTA)
    .flatMap((zone) => {
      const parsed = geoJsonFormat.readFeatures(
        { type: 'Feature', geometry: zone.geometry, properties: {} },
        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
      ) as Feature<Geometry>[];
      parsed.forEach((feature) => applyZoneFeatureProps(feature, zone));
      return parsed;
    });
}

function isDroneExpired(recordedAt?: string): boolean {
  if (!recordedAt) return false;
  return Date.now() - new Date(recordedAt).getTime() > 60_000;
}

function createDroneStyle(heading: number, selected: boolean): Style {
  return new Style({
    image: new Icon({
      anchor: [0.5, 1],
      scale: 0.02,
      src: '/assets/drone.png',
      rotation: degreesToRadians(heading),
      color: selected ? '#ffff00' : undefined,
    }),
  });
}

function getOwnedSerials(): string[] {
  return JSON.parse(localStorage.getItem('myDrones') ?? '[]');
}

function isDroneVisible(drone: Drone, isDisplayOwned: boolean, ownedSerials: string[]): boolean {
  const position = getDroneLatestPosition(drone);
  if (isDroneExpired(position?.recordedAt)) return false;
  if (isDisplayOwned && drone.serial && !ownedSerials.includes(drone.serial)) return false;
  return true;
}

export const OlMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  const { selectedDrone, setSelectedDrone, isDisplayOwned } = useDroneSelection();
  const { t } = useTranslation();
  const [map, setMap] = useState<OpenLayersMap | null>(null);
  const [showFlightZones, setShowFlightZones] = useState(true);
  const [zoneFilters, setZoneFilters] = useState<ZoneFilters>(DEFAULT_ZONE_FILTERS);
  const [zonesCache, setZonesCache] = useState<FlightRestrictionZoneResult[]>([]);
  const [zoneTooltip, setZoneTooltip] = useState<string | null>(null);

  const [droneSource] = useState<VectorSource<Feature<Point>>>(new VectorSource({ features: [] }));
  const [dronePathSource] = useState<VectorSource<Feature<LineString>>>(new VectorSource({ features: [] }));
  const [zonesSource] = useState<VectorSource<Feature<Geometry>>>(new VectorSource({ features: [] }));

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

  const syncDroneLayer = useCallback(() => {
    const ownedSerials = getOwnedSerials();
    const features: Feature<Point>[] = [];

    for (const drone of getDroneSnapshot()) {
      if (!isDroneVisible(drone, isDisplayOwned, ownedSerials)) continue;

      const position = getDroneLatestPosition(drone)!;
      const feature = new Feature({
        geometry: new Point(fromLonLat([position.longitude, position.latitude])),
      });
      feature.set('droneId', drone.id);
      feature.set('droneSerial', drone.serial);
      feature.setStyle(createDroneStyle(
        position.heading ?? 0,
        selectedDrone?.id === drone.id,
      ));
      features.push(feature);
    }

    droneSource.clear();
    droneSource.addFeatures(features);
  }, [droneSource, isDisplayOwned, selectedDrone?.id]);

  const syncPathLayer = useCallback(() => {
    const ownedSerials = getOwnedSerials();
    dronePathSource.clear();

    if (
      !selectedDrone ||
      (isDisplayOwned && selectedDrone.serial && !ownedSerials.includes(selectedDrone.serial))
    ) {
      return;
    }

    const session = getCurrentSession(selectedDrone.sessions);
    const path = session?.positions.map((p) => fromLonLat([p.longitude, p.latitude])) ?? [];
    if (path.length === 0) return;

    const lineFeature = new Feature({ geometry: new LineString(path) });
    lineFeature.set('droneId', selectedDrone.id);
    lineFeature.set('droneSerial', selectedDrone.serial);
    lineFeature.setStyle(new Style({ stroke: new Stroke({ color: 'red', width: 3 }) }));
    dronePathSource.addFeature(lineFeature);
  }, [dronePathSource, isDisplayOwned, selectedDrone]);

  useEffect(() => {
    const sync = () => {
      syncDroneLayer();
      syncPathLayer();
    };
    sync();
    return subscribeDrones(sync);
  }, [syncDroneLayer, syncPathLayer]);

  useEffect(() => {
    if (!mapRef.current) return;

    const zonesLayer = new VectorLayer({ source: zonesSource, zIndex: 1 });
    const dronePathLayer = new VectorLayer({ source: dronePathSource, zIndex: 2 });
    const droneLayer = new VectorLayer({ source: droneSource, zIndex: 3 });

    const olMap = new OpenLayersMap({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        zonesLayer,
        dronePathLayer,
        droneLayer,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857',
      }),
    });

    setMap(olMap);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          olMap.getView().animate({
            center: fromLonLat([pos.coords.longitude, pos.coords.latitude]),
            zoom: DEFAULT_MAP_ZOOM,
            duration: 800,
          });
        },
        () => {
          olMap.getView().animate({
            center: fromLonLat([18.06, 59.33]),
            zoom: DEFAULT_MAP_ZOOM,
            duration: 800,
          });
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    }

    olMap.on('click', (evt) => {
      let handled = false;

      olMap.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (handled) return;

        const zoneId = feature.get('zoneId');
        if (zoneId) {
          handled = true;
          const parts = [
            feature.get('zoneName') || feature.get('layerType'),
            feature.get('zoneDescription'),
            feature.get('lowerLimit') && feature.get('upperLimit')
              ? `${feature.get('lowerLimit')} – ${feature.get('upperLimit')}`
              : null,
            feature.get('validFrom') && feature.get('validTo')
              ? `${feature.get('validFrom')} – ${feature.get('validTo')}`
              : null,
          ].filter(Boolean);
          setZoneTooltip(parts.join('\n'));
          return;
        }

        const id = feature.get('droneId');
        if (id) {
          handled = true;
          setSelectedDrone(getDroneSnapshot().find((d) => d.id === id));
          setZoneTooltip(null);
        }
      });

      if (!handled) {
        setSelectedDrone(undefined);
        setZoneTooltip(null);
      }
    });

    return () => {
      olMap.setTarget(undefined);
      setMap(null);
    };
  }, [dronePathSource, droneSource, setSelectedDrone, zonesSource]);

  return (
    <Box position="relative" w="100%" h="100vh">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      <Box
        position="absolute"
        bottom={4}
        right={4}
        zIndex={1000}
        bg="whiteAlpha.900"
        p={3}
        borderRadius="md"
        shadow="md"
        maxW="280px"
      >
        <VStack align="stretch" spacing={2}>
          <Checkbox
            isChecked={showFlightZones}
            onChange={(e) => setShowFlightZones(e.target.checked)}
            size="sm"
          >
            {t('flight-restriction-zones')}
          </Checkbox>
          {showFlightZones && ZONE_FILTER_TYPES.map((type) => (
            <Checkbox
              key={type}
              isChecked={zoneFilters[type]}
              onChange={() => toggleZoneFilter(type)}
              size="sm"
              pl={4}
            >
              {t(ZONE_TYPE_I18N[type])}
            </Checkbox>
          ))}
          {zonesLoading && (
            <Text fontSize="xs" color="gray.600">{t('flight-zones-loading')}</Text>
          )}
          {showFlightZones && (
            <Text fontSize="xs" color="gray.500">© LFV — Drönarkarta</Text>
          )}
        </VStack>
      </Box>

      {zoneTooltip && (
        <Box
          position="absolute"
          top={4}
          left="50%"
          transform="translateX(-50%)"
          zIndex={1000}
          bg="whiteAlpha.950"
          p={3}
          borderRadius="md"
          shadow="md"
          maxW="400px"
          whiteSpace="pre-wrap"
          fontSize="sm"
        >
          {zoneTooltip}
        </Box>
      )}
    </Box>
  );
};
