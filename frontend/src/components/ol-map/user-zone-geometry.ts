import { transform } from 'ol/proj';
import { Circle, Geometry, Polygon } from 'ol/geom';
import { fromCircle } from 'ol/geom/Polygon';
import type { GeometryFunction } from 'ol/interaction/Draw';
import type { UserZoneShapeType } from '../../utils/user-zones';

function closeRing(ring: number[][]): number[][] {
  if (ring.length < 3) {
    throw new Error('Ring too short');
  }

  const result = ring.map(([lon, lat]) => [lon, lat]);
  const [fLon, fLat] = result[0];
  const [lLon, lLat] = result[result.length - 1];

  if (fLon !== lLon || fLat !== lLat) {
    result.push([fLon, fLat]);
  }

  if (result.length < 4) {
    throw new Error('Polygon must have at least 4 coordinate pairs');
  }

  return result;
}

function mercatorRingToWgs84(ring: number[][]): number[][] {
  return ring.map((coord) => transform(coord, 'EPSG:3857', 'EPSG:4326'));
}

export function rectangleRingFromDiagonal(a: number[], b: number[]): number[][] {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return [
    [minX, minY],
    [minX, maxY],
    [maxX, maxY],
    [maxX, minY],
    [minX, minY],
  ];
}

export function rectangleFromDiagonal(a: number[], b: number[]): Polygon {
  return new Polygon([rectangleRingFromDiagonal(a, b)]);
}

export function createDiagonalRectangle(): GeometryFunction {
  return (coordinates, geometry) => {
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    if (!start || !end) {
      return geometry ?? new Polygon([]);
    }

    const [x1, y1] = start;
    const [x2, y2] = end;
    if (x1 === x2 || y1 === y2) {
      return geometry ?? new Polygon([]);
    }

    const ring = rectangleRingFromDiagonal(start, end);

    if (geometry instanceof Polygon) {
      geometry.setCoordinates([ring]);
      return geometry;
    }

    return new Polygon([ring]);
  };
}

export function normalizeRectanglePolygon(polygon: Polygon): Polygon {
  const extent = polygon.getExtent();
  const [minX, minY, maxX, maxY] = extent;
  const normalized = polygon.clone();
  normalized.setCoordinates([rectangleRingFromDiagonal(
    [minX, minY],
    [maxX, maxY],
  )]);
  return normalized;
}

export function polygonToCircle(polygon: Polygon): Circle {
  const ring = polygon.getCoordinates()[0];
  const vertexCount = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1
    : ring.length;

  let centerX = 0;
  let centerY = 0;

  for (let i = 0; i < vertexCount; i += 1) {
    centerX += ring[i][0];
    centerY += ring[i][1];
  }

  centerX /= vertexCount;
  centerY /= vertexCount;

  let radius = 0;
  for (let i = 0; i < vertexCount; i += 1) {
    radius = Math.max(
      radius,
      Math.hypot(ring[i][0] - centerX, ring[i][1] - centerY),
    );
  }

  return new Circle([centerX, centerY], radius);
}

export function prepareGeometryForEdit(
  geometry: Geometry,
  shapeType: UserZoneShapeType,
): Geometry {
  if (shapeType === 'CIRCLE' && geometry instanceof Polygon) {
    return polygonToCircle(geometry);
  }

  if (shapeType === 'RECTANGLE' && geometry instanceof Polygon) {
    return normalizeRectanglePolygon(geometry);
  }

  return geometry.clone();
}

export function geometryToGeoJsonPolygon(
  geometry: Geometry,
  shapeType?: UserZoneShapeType,
): Record<string, unknown> {
  let polygon: Polygon;

  if (geometry instanceof Circle) {
    polygon = fromCircle(geometry, 64);
  } else if (geometry instanceof Polygon) {
    polygon = shapeType === 'RECTANGLE'
      ? normalizeRectanglePolygon(geometry)
      : geometry.clone();
  } else {
    throw new Error('Unsupported geometry type');
  }

  const ring = polygon.getCoordinates()[0];
  const wgs84Ring = closeRing(mercatorRingToWgs84(ring));

  for (const [lon, lat] of wgs84Ring) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new Error('Invalid coordinates');
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new Error('Coordinates out of range');
    }
  }

  return {
    type: 'Polygon',
    coordinates: [wgs84Ring],
  };
}

export function isValidDrawnGeometry(geometry: Geometry | null | undefined): boolean {
  if (!geometry) return false;

  if (geometry instanceof Circle) {
    return geometry.getRadius() > 0;
  }

  if (geometry instanceof Polygon) {
    const extent = geometry.getExtent();
    return extent[0] !== extent[2] && extent[1] !== extent[3];
  }

  return false;
}
