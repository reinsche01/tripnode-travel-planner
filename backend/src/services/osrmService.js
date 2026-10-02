import axios from 'axios';

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'http://router.project-osrm.org';

/**
 * Calculate a distance matrix between multiple coordinates using OSRM Table API.
 * Returns distances in km and durations in minutes.
 *
 * @param {Array<{lat: number, lng: number}>} coordinates - Array of coordinate objects
 * @returns {Promise<{distances: number[][], durations: number[][]}>}
 */
export async function getDistanceMatrix(coordinates) {
  if (coordinates.length < 2) {
    return { distances: [[0]], durations: [[0]] };
  }

  // OSRM expects coordinates as "lng,lat" (longitude first!)
  const coordString = coordinates
    .map(c => `${c.lng},${c.lat}`)
    .join(';');

  const url = `${OSRM_BASE_URL}/table/v1/driving/${coordString}`;
  const params = {
    annotations: 'distance,duration',
  };

  const resp = await axios.get(url, { params, timeout: 10000 });

  if (resp.data.code !== 'Ok') {
    throw new Error(`OSRM Error: ${resp.data.message || resp.data.code}`);
  }

  // Convert distances from meters to km
  const distances = resp.data.distances.map(row =>
    row.map(d => Math.round((d / 1000) * 100) / 100)
  );

  // Convert durations from seconds to minutes
  const durations = resp.data.durations.map(row =>
    row.map(d => Math.round(d / 60))
  );

  return { distances, durations };
}

/**
 * Calculate sequential distances between ordered points.
 * Returns an array where index i = distance from point i-1 to point i.
 *
 * @param {Array<{lat: number, lng: number}>} orderedCoords
 * @returns {Promise<Array<{distanceKm: number, durationMin: number}>>}
 */
export async function getSequentialDistances(orderedCoords) {
  if (orderedCoords.length < 2) {
    return orderedCoords.map(() => ({ distanceKm: 0, durationMin: 0 }));
  }

  const { distances, durations } = await getDistanceMatrix(orderedCoords);

  // Extract distances from point i to point i+1 (sequential path)
  return orderedCoords.map((_, i) => {
    if (i === 0) return { distanceKm: 0, durationMin: 0 };
    return {
      distanceKm: distances[i - 1][i],
      durationMin: durations[i - 1][i],
    };
  });
}

/**
 * Get an optimized route order using OSRM Trip API (nearest-neighbor TSP).
 *
 * @param {Array<{lat: number, lng: number}>} coordinates
 * @param {number} sourceIndex - Index of the fixed start point (e.g., hotel = 0)
 * @returns {Promise<{waypoints: Array, legs: Array}>}
 */
export async function getOptimizedRoute(coordinates, sourceIndex = 0) {
  if (coordinates.length < 2) return { waypoints: coordinates, legs: [] };

  const coordString = coordinates
    .map(c => `${c.lng},${c.lat}`)
    .join(';');

  const url = `${OSRM_BASE_URL}/trip/v1/driving/${coordString}`;
  const params = {
    source: 'first',
    destination: 'last',
    roundtrip: false,
    annotations: 'distance,duration',
  };

  const resp = await axios.get(url, { params, timeout: 15000 });

  if (resp.data.code !== 'Ok') {
    throw new Error(`OSRM Trip Error: ${resp.data.message || resp.data.code}`);
  }

  const waypoints = resp.data.waypoints
    .sort((a, b) => a.waypoint_index - b.waypoint_index)
    .map(w => ({
      originalIndex: w.trips_index,
      waypointIndex: w.waypoint_index,
      lat: w.location[1],
      lng: w.location[0],
    }));

  const legs = resp.data.trips[0].legs.map(leg => ({
    distanceKm: Math.round((leg.distance / 1000) * 100) / 100,
    durationMin: Math.round(leg.duration / 60),
  }));

  return { waypoints, legs };
}
