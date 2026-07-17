export function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

export function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

export function distanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDegrees(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

/**
 * @param {Array<{ latitude: number, longitude: number, altitude: number, holdMs?: number, legMs?: number }>} route
 * @param {number} targetSpeedKmh
 * @param {number} speedMultiplier
 * @param {{ cycleDurationMs?: number }} [options]
 */
export function buildRouteNavigator(route, targetSpeedKmh, speedMultiplier, options = {}) {
  const targetSpeedMetersPerSecond = targetSpeedKmh / 3.6;
  const cycleDurationMs = options.cycleDurationMs;

  /** @type {Array<{ kind: 'hold' | 'move', from: object, to: object, durationMs: number, heading: number, distanceM: number }>} */
  const segments = [];

  for (let index = 0; index < route.length; index += 1) {
    const from = route[index];
    const to = route[(index + 1) % route.length];
    const heading = bearingDegrees(from, to);

    const holdMs = Number(from.holdMs ?? 0);
    if (holdMs > 0) {
      segments.push({ kind: 'hold', from, to: from, durationMs: holdMs, heading, distanceM: 0 });
    }

    const distance = distanceMeters(from, to);
    if (distance <= 0 && from.legMs == null) continue;

    const legMs = from.legMs != null
      ? Number(from.legMs)
      : distance / targetSpeedMetersPerSecond * 1000;

    if (legMs > 0) {
      segments.push({ kind: 'move', from, to, durationMs: legMs, heading, distanceM: distance });
    }
  }

  if (cycleDurationMs != null && cycleDurationMs > 0 && segments.length > 0) {
    const holdTotal = segments
      .filter((s) => s.kind === 'hold')
      .reduce((sum, s) => sum + s.durationMs, 0);
    const moveSegments = segments.filter((s) => s.kind === 'move');
    const moveBudget = Math.max(0, cycleDurationMs - holdTotal);
    const moveTotal = moveSegments.reduce((sum, s) => sum + s.durationMs, 0);

    if (moveSegments.length > 0 && moveTotal > 0 && moveBudget > 0) {
      const scale = moveBudget / moveTotal;
      for (const segment of moveSegments) {
        segment.durationMs *= scale;
      }
    }
  }

  const routeDurationMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);

  function buildPosition(from, to, progress, elapsedMs, heading, speedKmh) {
    const liveWave = Math.sin(elapsedMs / 4500);

    return {
      latitude: lerp(from.latitude, to.latitude, progress),
      longitude: lerp(from.longitude, to.longitude, progress),
      altitude: lerp(from.altitude, to.altitude, progress) + liveWave * 1.5,
      speed: speedKmh + Math.sin(elapsedMs / 3000) * 0.7,
      heading,
    };
  }

  function segmentSpeedKmh(segment) {
    if (segment.kind !== 'move' || segment.durationMs <= 0 || segment.distanceM <= 0) {
      return targetSpeedKmh * speedMultiplier;
    }
    return (segment.distanceM / (segment.durationMs / 1000)) * 3.6 * speedMultiplier;
  }

  function getPosition(elapsedMs) {
    const anchor = route[0];
    if (routeDurationMs <= 0 || segments.length === 0) {
      const liveWave = Math.sin(elapsedMs / 4500);
      return {
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        altitude: anchor.altitude + liveWave * 1.5,
        speed: targetSpeedKmh * speedMultiplier,
        heading: 0,
      };
    }

    let timeOnRouteMs = (elapsedMs * speedMultiplier) % routeDurationMs;

    for (const segment of segments) {
      if (timeOnRouteMs > segment.durationMs) {
        timeOnRouteMs -= segment.durationMs;
        continue;
      }

      if (segment.kind === 'hold') {
        const liveWave = Math.sin(elapsedMs / 4500);
        return {
          latitude: segment.from.latitude,
          longitude: segment.from.longitude,
          altitude: segment.from.altitude + liveWave * 1.5,
          speed: Math.max(0.5, targetSpeedKmh * speedMultiplier * 0.15),
          heading: segment.heading,
        };
      }

      const progress = segment.durationMs > 0 ? timeOnRouteMs / segment.durationMs : 0;
      return buildPosition(
        segment.from,
        segment.to,
        progress,
        elapsedMs,
        segment.heading,
        segmentSpeedKmh(segment),
      );
    }

    const last = segments[segments.length - 1];
    if (last.kind === 'hold') {
      return {
        latitude: last.from.latitude,
        longitude: last.from.longitude,
        altitude: last.from.altitude,
        speed: targetSpeedKmh * speedMultiplier * 0.15,
        heading: last.heading,
      };
    }
    return buildPosition(last.from, last.to, 1, elapsedMs, last.heading, segmentSpeedKmh(last));
  }

  return { getPosition, routeDurationMs };
}
