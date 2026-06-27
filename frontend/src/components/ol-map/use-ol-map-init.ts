import { useEffect, useRef, type RefObject } from 'react';
import OpenLayersMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import { Feature } from 'ol';
import { Geometry, LineString, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { getDroneSnapshot } from '../../utils/drone-store';
import type { Drone } from '../../utils/types';
import { formatZoneTooltip } from './helpers';
import { DEFAULT_MAP_ZOOM } from './types';

interface UseOlMapInitOptions {
  mapRef: RefObject<HTMLDivElement | null>;
  zonesSource: VectorSource<Feature<Geometry>>;
  userZonesSource: VectorSource<Feature<Geometry>>;
  droneSource: VectorSource<Feature<Point>>;
  dronePathSource: VectorSource<Feature<LineString>>;
  onSelectDrone: (drone: Drone | undefined) => void;
  onZoneTooltip: (text: string | null) => void;
  onUserZoneSelect: (zoneId: string | null) => void;
  onMapReady: (map: OpenLayersMap | null) => void;
  mapInteractionsEnabled?: boolean;
}

export function useOlMapInit({
  mapRef,
  zonesSource,
  userZonesSource,
  droneSource,
  dronePathSource,
  onSelectDrone,
  onZoneTooltip,
  onUserZoneSelect,
  onMapReady,
  mapInteractionsEnabled = true,
}: UseOlMapInitOptions) {
  const mapInteractionsEnabledRef = useRef(mapInteractionsEnabled);
  mapInteractionsEnabledRef.current = mapInteractionsEnabled;

  useEffect(() => {
    if (!mapRef.current) return;

    const zonesLayer = new VectorLayer({ source: zonesSource, zIndex: 1 });
    const userZonesLayer = new VectorLayer({ source: userZonesSource, zIndex: 2 });
    const dronePathLayer = new VectorLayer({ source: dronePathSource, zIndex: 3 });
    const droneLayer = new VectorLayer({ source: droneSource, zIndex: 4 });

    const olMap = new OpenLayersMap({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        zonesLayer,
        userZonesLayer,
        dronePathLayer,
        droneLayer,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857',
      }),
    });

    onMapReady(olMap);

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
      if (!mapInteractionsEnabledRef.current) return;

      let handled = false;

      olMap.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (handled) return;

        const userZoneId = feature.get('userZoneId');
        if (userZoneId) {
          handled = true;
          onUserZoneSelect(userZoneId);
          onZoneTooltip(null);
          return;
        }

        const zoneId = feature.get('zoneId');
        if (zoneId) {
          handled = true;
          onUserZoneSelect(null);
          onZoneTooltip(formatZoneTooltip(feature as Feature<Geometry>));
          return;
        }

        const id = feature.get('droneId');
        if (id) {
          handled = true;
          onUserZoneSelect(null);
          onSelectDrone(getDroneSnapshot().find((d) => d.id === id));
          onZoneTooltip(null);
        }
      });

      if (!handled) {
        onSelectDrone(undefined);
        onZoneTooltip(null);
        onUserZoneSelect(null);
      }
    });

    return () => {
      olMap.setTarget(undefined);
      onMapReady(null);
    };
  }, [
    mapRef,
    dronePathSource,
    droneSource,
    onMapReady,
    onSelectDrone,
    onUserZoneSelect,
    onZoneTooltip,
    userZonesSource,
    zonesSource,
  ]);
}
