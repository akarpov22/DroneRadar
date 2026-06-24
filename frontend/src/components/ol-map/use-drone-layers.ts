import { useCallback, useEffect, useState } from 'react';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { getDroneSnapshot, subscribeDrones } from '../../utils/drone-store';
import { buildDroneFeatures, buildDronePathFeature } from './helpers';

export function useDroneLayers(
  isDisplayOwned: boolean,
  selectedDroneId?: number,
) {
  const [droneSource] = useState<VectorSource<Feature<Point>>>(
    () => new VectorSource({ features: [] }),
  );
  const [dronePathSource] = useState<VectorSource<Feature<LineString>>>(
    () => new VectorSource({ features: [] }),
  );

  const syncDroneLayer = useCallback(() => {
    droneSource.clear();
    droneSource.addFeatures(
      buildDroneFeatures(getDroneSnapshot(), isDisplayOwned, selectedDroneId),
    );
  }, [droneSource, isDisplayOwned, selectedDroneId]);

  const syncPathLayer = useCallback(() => {
    dronePathSource.clear();
    const pathFeature = buildDronePathFeature(
      getDroneSnapshot(),
      selectedDroneId,
      isDisplayOwned,
    );
    if (pathFeature) {
      dronePathSource.addFeature(pathFeature);
    }
  }, [dronePathSource, isDisplayOwned, selectedDroneId]);

  useEffect(() => {
    const sync = () => {
      syncDroneLayer();
      syncPathLayer();
    };
    sync();
    return subscribeDrones(sync);
  }, [syncDroneLayer, syncPathLayer]);

  return { droneSource, dronePathSource };
}
