import { useCallback, useEffect, useRef, useState } from 'react';
import { Feature } from 'ol';
import { LineString, Point, Polygon } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { getDroneLatestPosition, isDroneRegistered } from '../../utils/drone';
import { getDroneSnapshot, subscribeDrones } from '../../utils/drone-store';
import {
  computeFallRadiusMeters,
  createFallCircleFeature,
  isDroneSignalLost,
  updateFallCircleGeometry,
} from '../../utils/drone-signal';
import type { Drone } from '../../utils/types';
import {
  type DroneAnimState,
  getInterpolatedPosition,
  isAnimating,
  setAnimTarget,
} from './drone-animation';
import { applyDroneFeatureStyle, buildDronePathCoordinates, buildDronePathFeature } from './helpers';

const SIGNAL_CHECK_INTERVAL_MS = 5000;

function isDroneVisible(
  drone: Drone,
  showOnlyMine: boolean,
  myDroneIds: ReadonlySet<string>,
): boolean {
  if (!isDroneRegistered(drone)) return false;
  const position = getDroneLatestPosition(drone);
  if (!position) return false;
  if (showOnlyMine && !myDroneIds.has(drone.id)) return false;
  return true;
}

function getTrailEnd(state: DroneAnimState | undefined, nowMs: number) {
  if (!state) return undefined;
  const { longitude, latitude } = getInterpolatedPosition(state, nowMs);
  return { longitude, latitude };
}

export function useDroneLayers(
  selectedDroneId?: string,
  showOnlyMine = false,
  myDroneIds: ReadonlySet<string> = new Set(),
) {
  const [droneSource] = useState<VectorSource<Feature<Point>>>(
    () => new VectorSource({ features: [] }),
  );
  const [dronePathSource] = useState<VectorSource<Feature<LineString>>>(
    () => new VectorSource({ features: [] }),
  );
  const [droneFallCircleSource] = useState<VectorSource<Feature<Polygon>>>(
    () => new VectorSource({ features: [] }),
  );

  const animStatesRef = useRef<Map<string, DroneAnimState>>(new Map());
  const pathFeatureRef = useRef<Feature<LineString> | null>(null);
  const fallCircleFeatureRef = useRef<Feature<Polygon> | null>(null);
  const rafRef = useRef<number | null>(null);
  const selectedDroneIdRef = useRef(selectedDroneId);
  const showOnlyMineRef = useRef(showOnlyMine);
  const myDroneIdsRef = useRef(myDroneIds);

  selectedDroneIdRef.current = selectedDroneId;
  showOnlyMineRef.current = showOnlyMine;
  myDroneIdsRef.current = myDroneIds;

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const updateFallCircleLayer = useCallback(() => {
    const selectedId = selectedDroneIdRef.current;
    if (!selectedId) {
      droneFallCircleSource.clear();
      fallCircleFeatureRef.current = null;
      return;
    }

    const animState = animStatesRef.current.get(selectedId);
    if (!animState || !isDroneSignalLost(animState.pathCutoffRecordedAt)) {
      droneFallCircleSource.clear();
      fallCircleFeatureRef.current = null;
      return;
    }

    const drone = getDroneSnapshot().find((d) => d.id === selectedId);
    const position = drone ? getDroneLatestPosition(drone) : null;
    if (!position) {
      droneFallCircleSource.clear();
      fallCircleFeatureRef.current = null;
      return;
    }

    const { longitude, latitude } = getInterpolatedPosition(animState, performance.now());
    const radiusM = computeFallRadiusMeters(
      position.altitude,
      position.speed,
    );

    if (fallCircleFeatureRef.current) {
      updateFallCircleGeometry(fallCircleFeatureRef.current, longitude, latitude, radiusM);
      return;
    }

    const feature = createFallCircleFeature(longitude, latitude, radiusM);
    droneFallCircleSource.addFeature(feature);
    fallCircleFeatureRef.current = feature;
  }, [droneFallCircleSource]);

  const updatePathLayer = useCallback((nowMs: number) => {
    const selectedId = selectedDroneIdRef.current;
    if (!selectedId) {
      dronePathSource.clear();
      pathFeatureRef.current = null;
      return;
    }

    const animState = animStatesRef.current.get(selectedId);
    const trailEnd = getTrailEnd(animState, nowMs);
    const coordinates = buildDronePathCoordinates(
      getDroneSnapshot(),
      selectedId,
      trailEnd,
      animState?.pathCutoffRecordedAt,
    );

    if (!coordinates) {
      dronePathSource.clear();
      pathFeatureRef.current = null;
      return;
    }

    if (pathFeatureRef.current) {
      pathFeatureRef.current.getGeometry()?.setCoordinates(coordinates);
      pathFeatureRef.current.changed();
      return;
    }

    const pathFeature = buildDronePathFeature(
      getDroneSnapshot(),
      selectedId,
      trailEnd,
      animState?.pathCutoffRecordedAt,
    );
    if (pathFeature) {
      dronePathSource.addFeature(pathFeature);
      pathFeatureRef.current = pathFeature;
    }
  }, [dronePathSource]);

  const refreshDroneStyles = useCallback((nowMs: number) => {
    for (const state of animStatesRef.current.values()) {
      const lostSignal = isDroneSignalLost(state.pathCutoffRecordedAt);
      const { longitude, latitude, heading } = getInterpolatedPosition(state, nowMs);
      state.feature.getGeometry()?.setCoordinates(fromLonLat([longitude, latitude]));
      applyDroneFeatureStyle(
        state.feature,
        heading,
        selectedDroneIdRef.current === state.droneId,
        lostSignal,
      );
    }
  }, []);

  const tick = useCallback(() => {
    const nowMs = performance.now();
    let needsFrame = false;
    let selectedAnimating = false;

    for (const state of animStatesRef.current.values()) {
      const lostSignal = isDroneSignalLost(state.pathCutoffRecordedAt);
      const { longitude, latitude, heading } = getInterpolatedPosition(state, nowMs);
      state.feature.getGeometry()?.setCoordinates(fromLonLat([longitude, latitude]));
      applyDroneFeatureStyle(
        state.feature,
        heading,
        selectedDroneIdRef.current === state.droneId,
        lostSignal,
      );

      if (isAnimating(state, nowMs)) {
        needsFrame = true;
      }

      if (state.droneId === selectedDroneIdRef.current && isAnimating(state, nowMs)) {
        selectedAnimating = true;
      }
    }

    if (selectedAnimating) {
      updatePathLayer(nowMs);
    }

    if (needsFrame) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, [updatePathLayer]);

  const scheduleAnimation = useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const syncDroneLayer = useCallback(() => {
    const nowMs = performance.now();
    const visibleIds = new Set<string>();
    let startedAnimation = false;

    for (const drone of getDroneSnapshot()) {
      if (!isDroneVisible(drone, showOnlyMineRef.current, myDroneIdsRef.current)) continue;

      const position = getDroneLatestPosition(drone)!;
      visibleIds.add(drone.id);

      const existing = animStatesRef.current.get(drone.id);
      if (existing) {
        if (existing.recordedAt !== position.recordedAt) {
          setAnimTarget(existing, position, nowMs);
          startedAnimation = true;
        }
        const lostSignal = isDroneSignalLost(existing.pathCutoffRecordedAt);
        applyDroneFeatureStyle(
          existing.feature,
          existing.toHeading,
          selectedDroneIdRef.current === drone.id,
          lostSignal,
        );
        continue;
      }

      const feature = new Feature({
        geometry: new Point(fromLonLat([position.longitude, position.latitude])),
      });
      feature.set('droneId', drone.id);
      feature.set('droneSerial', drone.serial);

      const state: DroneAnimState = {
        droneId: drone.id,
        feature,
        fromLon: position.longitude,
        fromLat: position.latitude,
        toLon: position.longitude,
        toLat: position.latitude,
        toHeading: position.heading ?? 0,
        toSpeed: Math.max(position.speed ?? 0, 0),
        startMs: nowMs,
        durationMs: 0,
        recordedAt: position.recordedAt,
        pathCutoffRecordedAt: position.recordedAt,
      };

      applyDroneFeatureStyle(
        feature,
        position.heading ?? 0,
        selectedDroneIdRef.current === drone.id,
        isDroneSignalLost(position.recordedAt),
      );

      animStatesRef.current.set(drone.id, state);
      droneSource.addFeature(feature);
    }

    for (const [droneId, state] of animStatesRef.current) {
      if (visibleIds.has(droneId)) continue;
      droneSource.removeFeature(state.feature);
      animStatesRef.current.delete(droneId);
    }

    if (startedAnimation) {
      scheduleAnimation();
    }

    if (selectedDroneIdRef.current && visibleIds.has(selectedDroneIdRef.current)) {
      updatePathLayer(nowMs);
    }

    updateFallCircleLayer();
  }, [droneSource, scheduleAnimation, updatePathLayer, updateFallCircleLayer]);

  const syncPathLayer = useCallback(() => {
    updatePathLayer(performance.now());
  }, [updatePathLayer]);

  const syncAllLayers = useCallback(() => {
    syncDroneLayer();
    syncPathLayer();
  }, [syncDroneLayer, syncPathLayer]);

  useEffect(() => {
    syncAllLayers();
    return subscribeDrones(syncAllLayers);
  }, [syncAllLayers]);

  useEffect(() => {
    syncDroneLayer();
    syncPathLayer();
  }, [showOnlyMine, myDroneIds, syncDroneLayer, syncPathLayer]);

  useEffect(() => {
    pathFeatureRef.current = null;
    fallCircleFeatureRef.current = null;
    dronePathSource.clear();
    droneFallCircleSource.clear();

    const nowMs = performance.now();
    refreshDroneStyles(nowMs);
    updatePathLayer(nowMs);
    updateFallCircleLayer();
  }, [selectedDroneId, dronePathSource, droneFallCircleSource, refreshDroneStyles, updatePathLayer, updateFallCircleLayer]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nowMs = performance.now();
      refreshDroneStyles(nowMs);
      updateFallCircleLayer();
    }, SIGNAL_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshDroneStyles, updateFallCircleLayer]);

  useEffect(() => () => stopAnimationLoop(), [stopAnimationLoop]);

  return { droneSource, dronePathSource, droneFallCircleSource };
};
