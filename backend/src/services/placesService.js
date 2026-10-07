import axios from 'axios';
import supabase from '../utils/supabaseClient.js';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const CACHE_TTL_DAYS = 30;

/**
 * Search for a place using Geoapify Geocoding API.
 */
async function searchPlaceGeoapify(query, lat = null, lng = null) {
  try {
    console.log(`[Geoapify] Searching for: "${query}"`);
    const searchUrl = 'https://api.geoapify.com/v1/geocode/search';
    const params = {
      text: query,
      apiKey: GEOAPIFY_API_KEY,
      limit: 1,
      ...(lat && lng && { bias: `proximity:${lng},${lat}` }),
    };

    const resp = await axios.get(searchUrl, { params });
    const feature = resp.data.features?.[0];
    if (!feature) {
      console.warn(`[Geoapify] No result for: "${query}"`);
      return null;
    }

    const props = feature.properties;
    return {
      place_id: props.place_id || `geo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      name: props.name || props.formatted?.split(',')[0] || query,
      lat: props.lat,
      lng: props.lon,
      address: props.formatted || query,
      phone: null,
      website: props.website || null,
      rating: null,
      photo_url: null,
      opening_hours: null,
      types: props.categories || [],
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (err) {
    console.error(`[Geoapify] Error searching "${query}":`, err.response?.data?.message || err.message);
    return null;
  }
}

/**
 * Search for a place by text query and optional lat/lng bias.
 * Priority: Cache -> Geoapify (if key exists) -> Google Places -> null (AI fallback)
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

  // 2. Try Geoapify if configured
  if (GEOAPIFY_API_KEY) {
    const geoPlace = await searchPlaceGeoapify(query, lat, lng);
    if (geoPlace) {
      await cachePlace(geoPlace);
      return geoPlace;
    }
  }

  // 3. Fallback to Google Places Text Search API if key provided
  if (PLACES_API_KEY) {
    try {
      console.log(`[Places] Cache MISS — calling Google for: "${query}"`);
      const searchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      const params = {
        query,
        key: PLACES_API_KEY,
        ...(lat && lng && { location: `${lat},${lng}`, radius: 50000 }),
      };

      const searchResp = await axios.get(searchUrl, { params });
      if (searchResp.data.status !== 'OK') {
        if (searchResp.data.status === 'ZERO_RESULTS') {
          console.warn(`[Places] Zero results for: "${query}"`);
        } else {
          console.error(`[Places] Google API Error [${searchResp.data.status}]: ${searchResp.data.error_message || 'Unknown error'} (query: "${query}")`);
        }
        return null;
      }
      if (!searchResp.data.results?.length) return null;

      const topResult = searchResp.data.results[0];
      const placeId = topResult.place_id;

      // Get full place details
      const details = await getPlaceDetails(placeId);
      if (!details) return null;

      const normalized = normalizePlaceData(details);
      await cachePlace(normalized);
      return normalized;
    } catch (err) {
      console.error(`[Places] Google Search error:`, err.message);
      return null;
    }
  }

  return null;
}

/**
 * Get place autocomplete suggestions for input.
 *
 * @param {string} input - User's search input
 * @param {string|null} location - "lat,lng" string for location bias
 * @returns {Promise<Array>} Array of suggestion objects
 */
export async function getAutocompleteSuggestions(input, location = null) {
  if (GEOAPIFY_API_KEY) {
    try {
      const url = 'https://api.geoapify.com/v1/geocode/autocomplete';
      const params = {
        text: input,
        apiKey: GEOAPIFY_API_KEY,
        limit: 5,
      };
      if (location) {
        const [lat, lng] = location.split(',');
        if (lat && lng) params.bias = `proximity:${lng.trim()},${lat.trim()}`;
      }
      const resp = await axios.get(url, { params });
      return (resp.data.features || []).map(f => ({
        placeId: f.properties.place_id,
        description: f.properties.formatted,
        mainText: f.properties.name || f.properties.city || f.properties.formatted,
        secondaryText: f.properties.formatted,
      }));
    } catch (err) {
      console.error('[Geoapify] Autocomplete error:', err.message);
    }
  }

  if (PLACES_API_KEY) {
    try {
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
    } catch (err) {
      console.error('[Places] Google autocomplete error:', err.message);
    }
  }

  return [];
}

/**
 * Fetch full place details from Google Places API by placeId.
 */
async function getPlaceDetails(placeId) {
  // Check cache first
  const { data: cached } = await supabase
    .from('places_cache')
    .select('*')
    .eq('place_id', placeId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) {
    console.log(`[Places] Detail cache HIT for placeId: ${placeId}`);
    // Re-normalize cached data so lat/lng fields are always present
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
    place_id: rawPlace.place_id || rawPlace.google_place_id,
    name: rawPlace.name,
    lat: rawPlace.geometry?.location?.lat || rawPlace.lat,
    lng: rawPlace.geometry?.location?.lng || rawPlace.lng,
    address: rawPlace.formatted_address || rawPlace.address,
    phone: rawPlace.formatted_phone_number || rawPlace.phone || null,
    website: rawPlace.website || null,
    rating: rawPlace.rating || null,
    photo_url: photoUrl || rawPlace.photo_url || null,
    opening_hours: rawPlace.opening_hours || null,
    types: rawPlace.types || [],
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Store a normalized place in the Supabase cache.
 */
async function cachePlace(place) {
  const cachePayload = {
    place_id: place.place_id,
    name: place.name,
    address: place.address || null,
    lat: place.lat || null,
    lng: place.lng || null,
    photo_url: place.photo_url || null,
    opening_hours: place.opening_hours || null,
    types: place.types || [],
    rating: place.rating || null,
    cached_at: place.cached_at || new Date().toISOString(),
    expires_at: place.expires_at || new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { error } = await supabase
    .from('places_cache')
    .upsert(cachePayload, { onConflict: 'place_id' });

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
    .maybeSingle();

  return data || null;
}

/**
 * Check if a place is currently open given its opening_hours JSON.
 *
 * @param {Object} openingHours - Google Places opening_hours object
 * @returns {boolean}
 */
export function isCurrentlyOpen(openingHours) {
  // If no opening_hours data at all, assume open (don't filter it out)
  if (!openingHours || openingHours.open_now === undefined) return true;
  return openingHours.open_now === true;
}
