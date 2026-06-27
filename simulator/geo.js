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
  const segmentDurationMs = (from, to) => {
    const targetSpeedMetersPerSecond = targetSpeedKmh / 3.6;
    return distanceMeters(from, to) / targetSpeedMetersPerSecond * 1000;
  };

  const routeDurationMs = route.reduce((sum, point, index) => {
    const nextPoint = route[(index + 1) % route.length];
    return sum + segmentDurationMs(point, nextPoint);
  }, 0);

  function getPosition(elapsedMs) {
    let timeOnRouteMs = (elapsedMs * speedMultiplier) % routeDurationMs;

    for (let index = 0; index < route.length; index += 1) {
      const from = route[index];
      const to = route[(index + 1) % route.length];
      const durationMs = segmentDurationMs(from, to);

      if (timeOnRouteMs > durationMs) {
        timeOnRouteMs -= durationMs;
        continue;
      }

      const progress = timeOnRouteMs / durationMs;
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

    return route[0];
  }

  return { getPosition, routeDurationMs };
}
