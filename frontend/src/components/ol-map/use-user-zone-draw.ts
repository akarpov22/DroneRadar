import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import type OpenLayersMap from 'ol/Map';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Collection from 'ol/Collection';
import { Feature } from 'ol';
import { Geometry, Polygon } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import {
  CREATE_USER_ZONE,
  DELETE_USER_ZONE,
  UPDATE_USER_ZONE,
} from '../../utils/graphql-queries';
import type { UserZoneShapeType } from '../../utils/user-zones';
import {
  createDiagonalRectangle,
  geometryToGeoJsonPolygon,
  isValidDrawnGeometry,
  prepareGeometryForEdit,
} from './user-zone-geometry';
import { attachRectangleDiagonalModify } from './rectangle-diagonal-edit';
import { getUserZoneDrawStyle, getUserZoneModifyStyle } from './user-zone-modify-styles';

export type DrawMode = 'POLYGON' | 'RECTANGLE' | 'CIRCLE' | null;

export interface PendingUserZone {
  shapeType: UserZoneShapeType;
  geometry: Record<string, unknown>;
}

interface UseUserZoneDrawOptions {
  map: OpenLayersMap | null;
  userZonesSource: VectorSource<Feature<Geometry>>;
  isPilot: boolean;
  selectedZoneId: string | null;
  setSelectedZoneId: (id: string | null) => void;
  onZonesChange: () => Promise<void>;
  onInteractionActiveChange?: (active: boolean) => void;
}

export function useUserZoneDraw({
  map,
  userZonesSource,
  isPilot,
  selectedZoneId,
  setSelectedZoneId,
  onZonesChange,
  onInteractionActiveChange,
}: UseUserZoneDrawOptions) {
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingZone, setPendingZone] = useState<PendingUserZone | null>(null);
  const [renamingZoneId, setRenamingZoneId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawRef = useRef<Draw | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const rectangleEditCleanupRef = useRef<(() => void) | null>(null);
  const sketchRef = useRef<Feature<Geometry> | null>(null);
  const editingFeatureRef = useRef<Feature<Geometry> | null>(null);

  const [createUserZone] = useMutation(CREATE_USER_ZONE);
  const [updateUserZone] = useMutation(UPDATE_USER_ZONE);
  const [deleteUserZone] = useMutation(DELETE_USER_ZONE);

  const interactionActive = drawMode !== null || isEditing || pendingZone !== null;

  useEffect(() => {
    onInteractionActiveChange?.(interactionActive);
  }, [interactionActive, onInteractionActiveChange]);

  const clearDrawInteraction = useCallback(() => {
    if (!map) return;
    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (sketchRef.current) {
      userZonesSource.removeFeature(sketchRef.current);
      sketchRef.current = null;
    }
  }, [map, userZonesSource]);

  const clearModifyInteraction = useCallback(() => {
    if (rectangleEditCleanupRef.current) {
      rectangleEditCleanupRef.current();
      rectangleEditCleanupRef.current = null;
    }
    if (!map) return;
    if (modifyRef.current) {
      map.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }
    editingFeatureRef.current = null;
  }, [map]);

  const clearInteractions = useCallback(() => {
    clearDrawInteraction();
    clearModifyInteraction();
  }, [clearDrawInteraction, clearModifyInteraction]);

  const cancelDraw = useCallback(() => {
    const wasEditing = isEditing;
    clearInteractions();
    setDrawMode(null);
    setIsEditing(false);
    setPendingZone(null);
    setError(null);
    if (wasEditing) {
      void onZonesChange();
    }
  }, [clearInteractions, isEditing, onZonesChange]);

  const finishDraw = useCallback((feature: Feature<Geometry>, mode: DrawMode) => {
    const geometry = feature.getGeometry();
    if (!geometry || !mode || !isValidDrawnGeometry(geometry)) {
      setError('Invalid geometry');
      userZonesSource.removeFeature(feature);
      return;
    }

    try {
      const geoJson = geometryToGeoJsonPolygon(geometry, mode);
      userZonesSource.removeFeature(feature);
      sketchRef.current = null;
      setPendingZone({ shapeType: mode, geometry: geoJson });
      setDrawMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid geometry');
      userZonesSource.removeFeature(feature);
      setDrawMode(null);
    }
  }, [userZonesSource]);

  const startDraw = useCallback((mode: DrawMode) => {
    if (!map || !isPilot || !mode) return;
    clearInteractions();
    setIsEditing(false);
    setPendingZone(null);
    setError(null);
    setDrawMode(mode);
    setSelectedZoneId(null);

    const draw = mode === 'RECTANGLE'
      ? new Draw({
        source: userZonesSource,
        type: 'LineString',
        maxPoints: 2,
        geometryFunction: createDiagonalRectangle(),
        style: getUserZoneDrawStyle(),
      })
      : new Draw({
        source: userZonesSource,
        type: mode === 'CIRCLE' ? 'Circle' : 'Polygon',
        style: getUserZoneDrawStyle(),
      });

    draw.on('drawstart', (evt) => {
      sketchRef.current = evt.feature as Feature<Geometry>;
    });

    draw.on('drawend', (evt) => {
      const feature = evt.feature as Feature<Geometry>;
      finishDraw(feature, mode);
      map.removeInteraction(draw);
      drawRef.current = null;
    });

    map.addInteraction(draw);
    drawRef.current = draw;
  }, [map, isPilot, clearInteractions, userZonesSource, setSelectedZoneId, finishDraw]);

  const startEdit = useCallback((zoneId: string) => {
    if (!isPilot) return;
    clearDrawInteraction();
    setDrawMode(null);
    setPendingZone(null);
    setError(null);
    setSelectedZoneId(zoneId);
    setIsEditing(true);
  }, [isPilot, clearDrawInteraction, setSelectedZoneId]);

  useEffect(() => {
    if (!isEditing || !map || !selectedZoneId) {
      clearModifyInteraction();
      return;
    }

    const feature = userZonesSource.getFeatures().find(
      (f) => f.get('userZoneId') === selectedZoneId,
    );
    if (!feature) return;

    const shapeType = feature.get('userZoneShapeType') as UserZoneShapeType;
    const prepared = prepareGeometryForEdit(feature.getGeometry()!, shapeType);
    feature.setGeometry(prepared);
    editingFeatureRef.current = feature;

    if (shapeType === 'RECTANGLE') {
      rectangleEditCleanupRef.current = attachRectangleDiagonalModify(map, feature);
      map.render();
      return () => {
        if (rectangleEditCleanupRef.current) {
          rectangleEditCleanupRef.current();
          rectangleEditCleanupRef.current = null;
        }
        editingFeatureRef.current = null;
      };
    }

    const collection = new Collection([feature]);
    const modify = new Modify({
      features: collection,
      style: getUserZoneModifyStyle(),
      insertVertexCondition: () => false,
      pixelTolerance: 14,
    });

    map.addInteraction(modify);
    modifyRef.current = modify;
    map.render();

    return () => {
      map.removeInteraction(modify);
      modifyRef.current = null;
      editingFeatureRef.current = null;
    };
  }, [isEditing, map, selectedZoneId, userZonesSource, clearModifyInteraction]);

  const saveEdit = useCallback(async () => {
    if (!selectedZoneId || !isEditing) return;

    const feature = editingFeatureRef.current ?? userZonesSource.getFeatures().find(
      (f) => f.get('userZoneId') === selectedZoneId,
    );
    const geometry = feature?.getGeometry();
    if (!geometry || !feature) return;

    const shapeType = feature.get('userZoneShapeType') as UserZoneShapeType;

    setSaving(true);
    setError(null);
    try {
      const geoJson = geometryToGeoJsonPolygon(geometry, shapeType);
      await updateUserZone({
        variables: { input: { id: selectedZoneId, geometry: geoJson } },
      });
      await onZonesChange();
      cancelDraw();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }, [selectedZoneId, isEditing, userZonesSource, updateUserZone, onZonesChange, cancelDraw]);

  const confirmCreate = useCallback(async (name: string) => {
    if (!pendingZone) return;

    setSaving(true);
    setError(null);
    try {
      await createUserZone({
        variables: {
          input: {
            name: name.trim() || null,
            shapeType: pendingZone.shapeType,
            geometry: pendingZone.geometry,
          },
        },
      });
      await onZonesChange();
      setPendingZone(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }, [pendingZone, createUserZone, onZonesChange]);

  const openRenameZone = useCallback((zoneId: string) => {
    setRenamingZoneId(zoneId);
    setError(null);
  }, []);

  const closeRenameZone = useCallback(() => {
    setRenamingZoneId(null);
  }, []);

  const renameZone = useCallback(async (zoneId: string, name: string) => {
    setSaving(true);
    setError(null);
    try {
      await updateUserZone({
        variables: { input: { id: zoneId, name: name.trim() || null } },
      });
      await onZonesChange();
      setRenamingZoneId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setSaving(false);
    }
  }, [updateUserZone, onZonesChange]);

  const removeZone = useCallback(async (zoneId: string) => {
    setSaving(true);
    setError(null);
    try {
      await deleteUserZone({ variables: { id: zoneId } });
      if (selectedZoneId === zoneId) {
        setSelectedZoneId(null);
      }
      await onZonesChange();
      cancelDraw();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }, [deleteUserZone, onZonesChange, selectedZoneId, setSelectedZoneId, cancelDraw]);

  useEffect(() => {
    if (!isPilot) {
      cancelDraw();
    }
  }, [isPilot, cancelDraw]);

  useEffect(() => () => clearInteractions(), [clearInteractions]);

  useEffect(() => {
    if (!interactionActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      cancelDraw();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interactionActive, cancelDraw]);

  return {
    drawMode,
    isEditing,
    pendingZone,
    renamingZoneId,
    saving,
    error,
    interactionActive,
    startDraw,
    startEdit,
    saveEdit,
    cancelDraw,
    confirmCreate,
    openRenameZone,
    closeRenameZone,
    renameZone,
    removeZone,
  };
}
