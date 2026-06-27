import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import Translate from 'ol/interaction/Translate';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Geometry, Point, Polygon } from 'ol/geom';
import type Map from 'ol/Map';
import type Interaction from 'ol/interaction/Interaction';
import { createUserZoneStyle } from '../../utils/user-zones';
import {
  normalizeRectanglePolygon,
  rectangleFromDiagonal,
} from './user-zone-geometry';
import { getUserZoneDrawStyle, getUserZoneModifyStyle } from './user-zone-modify-styles';

export function attachRectangleDiagonalModify(
  map: Map,
  zoneFeature: Feature<Geometry>,
): () => void {
  const geometry = zoneFeature.getGeometry();
  if (!(geometry instanceof Polygon)) {
    return () => {};
  }

  const normalized = normalizeRectanglePolygon(geometry);
  zoneFeature.setGeometry(normalized);
  zoneFeature.setStyle(getUserZoneDrawStyle());

  const handlesSource = new VectorSource<Feature<Geometry>>();
  const handlesLayer = new VectorLayer({
    source: handlesSource,
    zIndex: 5,
  });
  map.addLayer(handlesLayer);

  const ring = normalized.getCoordinates()[0];
  const handleA = new Feature(new Point(ring[0]));
  const handleB = new Feature(new Point(ring[2]));
  handleA.setStyle(getUserZoneModifyStyle());
  handleB.setStyle(getUserZoneModifyStyle());

  const previewFeature = new Feature(normalized.clone());
  previewFeature.setStyle(getUserZoneDrawStyle());

  handlesSource.addFeatures([previewFeature, handleA, handleB]);

  const syncRectangleFromHandles = () => {
    const pointA = handleA.getGeometry() as Point;
    const pointB = handleB.getGeometry() as Point;
    const polygon = rectangleFromDiagonal(
      pointA.getCoordinates(),
      pointB.getCoordinates(),
    );

    previewFeature.setGeometry(polygon.clone());
    zoneFeature.setGeometry(polygon);
    zoneFeature.changed();
    previewFeature.changed();
  };

  // One Translate per handle — a shared Collection moves both corners together.
  const translateA = new Translate({
    features: new Collection([handleA]),
    hitTolerance: 14,
  });
  const translateB = new Translate({
    features: new Collection([handleB]),
    hitTolerance: 14,
  });

  const interactions: Interaction[] = [translateA, translateB];
  for (const interaction of interactions) {
    interaction.on('translating', syncRectangleFromHandles);
    interaction.on('translateend', syncRectangleFromHandles);
    map.addInteraction(interaction);
  }

  return () => {
    for (const interaction of interactions) {
      map.removeInteraction(interaction);
    }
    map.removeLayer(handlesLayer);
    handlesSource.clear();
    zoneFeature.setStyle(createUserZoneStyle(true));
  };
}
