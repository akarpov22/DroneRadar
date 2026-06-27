import { useCallback, useEffect, useRef, useState } from 'react';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { getDroneLatestPosition } from '../../utils/drone';
import { getDroneSnapshot, subscribeDrones } from '../../utils/drone-store';
import type { Drone } from '../../utils/types';
import {
  type DroneAnimState,
  getInterpolatedPosition,
  isAnimating,
  setAnimTarget,
} from './drone-animation';
import { applyDroneFeatureStyle, buildDronePathCoordinates, buildDronePathFeature } from './helpers';

function isDroneExpired(recordedAt?: string): boolean {
  if (!recordedAt) return false;
  return Date.now() - new Date(recordedAt).getTime() > 60_000;
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

function getTrailEnd(state: DroneAnimState | undefined, nowMs: number) {
  if (!state) return undefined;
  const { longitude, latitude } = getInterpolatedPosition(state, nowMs);
  return { longitude, latitude };
}

export function useDroneLayers(
  isDisplayOwned: boolean,
  selectedDroneId?: string,
) {
  const [droneSource] = useState<VectorSource<Feature<Point>>>(
    () => new VectorSource({ features: [] }),
  );
  const [dronePathSource] = useState<VectorSource<Feature<LineString>>>(
    () => new VectorSource({ features: [] }),
  );

  const animStatesRef = useRef<Map<string, DroneAnimState>>(new Map());
  const pathFeatureRef = useRef<Feature<LineString> | null>(null);
  const rafRef = useRef<number | null>(null);
  const selectedDroneIdRef = useRef(selectedDroneId);
  const isDisplayOwnedRef = useRef(isDisplayOwned);

  selectedDroneIdRef.current = selectedDroneId;
  isDisplayOwnedRef.current = isDisplayOwned;

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

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
      isDisplayOwnedRef.current,
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
      isDisplayOwnedRef.current,
      trailEnd,
      animState?.pathCutoffRecordedAt,
    );
    if (pathFeature) {
      dronePathSource.addFeature(pathFeature);
      pathFeatureRef.current = pathFeature;
    }
  }, [dronePathSource]);

  const tick = useCallback(() => {
    const nowMs = performance.now();
    let needsFrame = false;
    let selectedAnimating = false;

    for (const state of animStatesRef.current.values()) {
      const { longitude, latitude, heading } = getInterpolatedPosition(state, nowMs);
      state.feature.getGeometry()?.setCoordinates(fromLonLat([longitude, latitude]));
      applyDroneFeatureStyle(
        state.feature,
        heading,
        selectedDroneIdRef.current === state.droneId,
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
    const ownedSerials = getOwnedSerials();
    const visibleIds = new Set<string>();
    let startedAnimation = false;

    for (const drone of getDroneSnapshot()) {
      if (!isDroneVisible(drone, isDisplayOwnedRef.current, ownedSerials)) continue;

      const position = getDroneLatestPosition(drone)!;
      visibleIds.add(drone.id);

      const existing = animStatesRef.current.get(drone.id);
      if (existing) {
        if (existing.recordedAt !== position.recordedAt) {
          setAnimTarget(existing, position, nowMs);
          startedAnimation = true;
        }
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
  }, [droneSource, scheduleAnimation, updatePathLayer]);

  const syncPathLayer = useCallback(() => {
    updatePathLayer(performance.now());
  }, [updatePathLayer]);

  useEffect(() => {
    const sync = () => {
      syncDroneLayer();
      syncPathLayer();
    };
    sync();
    return subscribeDrones(sync);
  }, [syncDroneLayer, syncPathLayer]);

  useEffect(() => {
    pathFeatureRef.current = null;
    dronePathSource.clear();

    const nowMs = performance.now();
    for (const state of animStatesRef.current.values()) {
      const { heading } = getInterpolatedPosition(state, nowMs);
      applyDroneFeatureStyle(
        state.feature,
        heading,
        selectedDroneId === state.droneId,
      );
    }

    updatePathLayer(nowMs);
  }, [selectedDroneId, dronePathSource, updatePathLayer]);

  useEffect(() => () => stopAnimationLoop(), [stopAnimationLoop]);

  return { droneSource, dronePathSource };
};
