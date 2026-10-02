import axios from 'axios';
import supabase from '../utils/supabaseClient.js';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CACHE_TTL_DAYS = 30;

/**
 * Search for a place by text query and optional lat/lng bias.
 * Results are cached in Supabase to minimize API calls.
 *
 * @param {string} query - Place name or address
 * @param {number|null} lat - Latitude bias (optional)
 * @param {number|null} lng - Longitude bias (optional)
 * @returns {Promise<Object|null>} Normalized place object or null
 */
export async function searchPlace(query, lat = null, lng = null) {
  // 1. Check cache by approximate name match
  const cached = await getCachedByName(query);
  if (cached) {
    console.log(`[Places] Cache HIT for: "${query}"`);
    return cached;
  }

  // 2. Call Google Places Text Search API
  console.log(`[Places] Cache MISS — calling Google for: "${query}"`);
  const searchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const params = {
    query,
    key: PLACES_API_KEY,
    ...(lat && lng && { location: `${lat},${lng}`, radius: 50000 }),
  };

  const searchResp = await axios.get(searchUrl, { params });
  if (!searchResp.data.results?.length) return null;

  const topResult = searchResp.data.results[0];
  const placeId = topResult.place_id;

  // 3. Get full place details (opening hours, photos, etc.)
  const details = await getPlaceDetails(placeId);
  if (!details) return null;

  // 4. Store in cache
  const normalized = normalizePlaceData(details);
  await cachePlace(normalized);

  return normalized;
}

/**
 * Get place autocomplete suggestions for input.
 *
 * @param {string} input - User's search input
 * @param {string|null} location - "lat,lng" string for location bias
 * @returns {Promise<Array>} Array of suggestion objects
 */
export async function getAutocompleteSuggestions(input, location = null) {
  const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  const params = {
    input,
    key: PLACES_API_KEY,
    types: 'establishment',
    ...(location && { location, radius: 50000 }),
  };

  const resp = await axios.get(url, { params });
  return (resp.data.predictions || []).map(p => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || '',
    secondaryText: p.structured_formatting?.secondary_text || '',
  }));
}

/**
 * Fetch full place details from Google Places API by placeId.
 */
async function getPlaceDetails(placeId) {
  // Check cache first
  const { data: cached } = await supabase
    .from('places_cache')
    .select('*')
    .eq('google_place_id', placeId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    console.log(`[Places] Detail cache HIT for placeId: ${placeId}`);
    return cached;
  }

  const url = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = {
    place_id: placeId,
    key: PLACES_API_KEY,
    fields: 'place_id,name,formatted_address,geometry,opening_hours,photos,rating,formatted_phone_number,website,types',
  };

  const resp = await axios.get(url, { params });
  if (resp.data.status !== 'OK') return null;

  return resp.data.result;
}

/**
 * Normalize raw Google Places API result to our schema.
 */
function normalizePlaceData(rawPlace) {
  const photoRef = rawPlace.photos?.[0]?.photo_reference;
  const photoUrl = photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${PLACES_API_KEY}`
    : null;

  return {
    google_place_id: rawPlace.place_id || rawPlace.google_place_id,
    name: rawPlace.name,
    lat: rawPlace.geometry?.location?.lat || rawPlace.lat,
    lng: rawPlace.geometry?.location?.lng || rawPlace.lng,
    address: rawPlace.formatted_address || rawPlace.address,
    phone: rawPlace.formatted_phone_number || rawPlace.phone || null,
    website: rawPlace.website || null,
    rating: rawPlace.rating || null,
    photo_url: photoUrl || rawPlace.photo_url || null,
    opening_hours: rawPlace.opening_hours || rawPlace.opening_hours || null,
    types: rawPlace.types || [],
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Store a normalized place in the Supabase cache.
 */
async function cachePlace(place) {
  const { error } = await supabase
    .from('places_cache')
    .upsert(place, { onConflict: 'google_place_id' });

  if (error) {
    console.error('[Places] Failed to cache place:', error.message);
  }
}

/**
 * Attempt to find a cached place by approximate name.
 */
async function getCachedByName(query) {
  const { data } = await supabase
    .from('places_cache')
    .select('*')
    .ilike('name', `%${query}%`)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  return data || null;
}

/**
 * Check if a place is currently open given its opening_hours JSON.
 *
 * @param {Object} openingHours - Google Places opening_hours object
 * @returns {boolean}
 */
export function isCurrentlyOpen(openingHours) {
  if (!openingHours?.open_now === undefined) return true; // assume open if no data
  return openingHours.open_now === true;
}
