export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateEtaMinutes(distanceMeters: number, mode: 'WALK' | 'DRIVE' | 'ANY'): number {
  const speedKmh = mode === 'WALK' ? 5 : 35;
  const speedMps = (speedKmh * 1000) / 3600;
  return Math.max(1, Math.round(distanceMeters / speedMps / 60));
}
