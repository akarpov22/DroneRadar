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

export function buildRouteNavigator(route, targetSpeedKmh, speedMultiplier) {
  const targetSpeedMetersPerSecond = targetSpeedKmh / 3.6;

  const segments = [];
  for (let index = 0; index < route.length; index += 1) {
    const from = route[index];
    const to = route[(index + 1) % route.length];
    const distance = distanceMeters(from, to);
    if (distance <= 0) continue;

    segments.push({
      from,
      to,
      durationMs: distance / targetSpeedMetersPerSecond * 1000,
    });
  }

  const routeDurationMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);

  function buildPosition(from, to, progress, elapsedMs) {
    const speedKmh = targetSpeedKmh * speedMultiplier;
    const liveWave = Math.sin(elapsedMs / 4500);

    return {
      latitude: lerp(from.latitude, to.latitude, progress),
      longitude: lerp(from.longitude, to.longitude, progress),
      altitude: lerp(from.altitude, to.altitude, progress) + liveWave * 1.5,
      speed: speedKmh + Math.sin(elapsedMs / 3000) * 0.7,
      heading: bearingDegrees(from, to),
    };
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

      const progress = segment.durationMs > 0 ? timeOnRouteMs / segment.durationMs : 0;
      return buildPosition(segment.from, segment.to, progress, elapsedMs);
    }

    const last = segments[segments.length - 1];
    return buildPosition(last.from, last.to, 1, elapsedMs);
  }

  return { getPosition, routeDurationMs };
}
