import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchPlace, isCurrentlyOpen } from './placesService.js';
import { getSequentialDistances } from './osrmService.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * JSON schema for Gemini structured output.
 */
const ITINERARY_SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day_number: { type: 'integer' },
          date: { type: 'string', description: 'YYYY-MM-DD format' },
          suggested_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: {
                  type: 'string',
                  enum: ['food', 'culture', 'nature', 'shopping', 'entertainment', 'wellness'],
                },
                start_time: { type: 'string', description: 'HH:MM format' },
                end_time: { type: 'string', description: 'HH:MM format' },
                duration_minutes: { type: 'integer' },
                search_query: {
                  type: 'string',
                  description: 'Specific search query for Google Places API',
                },
                notes: { type: 'string' },
                why_recommended: { type: 'string', description: 'Brief reason for recommendation' },
              },
              required: ['name', 'category', 'start_time', 'end_time', 'duration_minutes', 'search_query'],
            },
          },
        },
        required: ['day_number', 'date', 'suggested_items'],
      },
    },
  },
  required: ['days'],
};

/**
 * Generate AI-powered itinerary suggestions to fill empty time slots.
 * This is the core "Fill-the-Blank" feature.
 *
 * @param {Object} tripData - Full trip object with days and locked items
 * @returns {Promise<Array>} Array of enriched itinerary items ready to save
 */
export async function generateItinerary(tripData) {
  const {
    destination_city,
    destination_country,
    travel_style,
    traveler_count,
    hotel_name,
    hotel_lat,
    hotel_lng,
    trip_days,
  } = tripData;

  // 1. Build the prompt
  const prompt = buildPrompt({
    city: destination_city,
    country: destination_country,
    style: travel_style,
    travelers: traveler_count,
    hotelName: hotel_name,
    hotelLat: hotel_lat,
    hotelLng: hotel_lng,
    days: trip_days,
  });

  console.log('[Gemini] Sending prompt for trip to:', destination_city);

  // 2. Call Gemini with structured output
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ITINERARY_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent(prompt);
  const rawJson = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Gemini returned invalid JSON. Please try again.');
  }

  // 3. Enrich each suggested item with Places data + validate hours
  const enrichedDays = await Promise.all(
    parsed.days.map(async (day) => {
      const enrichedItems = await Promise.all(
        day.suggested_items.map(async (item) => {
          try {
            const placeData = await searchPlace(item.search_query, hotel_lat, hotel_lng);

            // Skip places that are closed at the suggested time
            if (placeData?.opening_hours && !isCurrentlyOpen(placeData.opening_hours)) {
              console.warn(`[Gemini] Skipping closed place: ${item.name}`);
              return null;
            }

            return {
              ...item,
              place_id: placeData?.google_place_id || null,
              lat: placeData?.lat || null,
              lng: placeData?.lng || null,
              address: placeData?.address || null,
              photo_url: placeData?.photo_url || null,
              rating: placeData?.rating || null,
              status: 'suggested',
              type: 'suggested',
            };
          } catch (err) {
            console.error(`[Gemini] Failed to enrich item "${item.name}":`, err.message);
            return {
              ...item,
              status: 'suggested',
              type: 'suggested',
            };
          }
        })
      );

      // Filter out null (closed/invalid) items
      const validItems = enrichedItems.filter(Boolean);

      return {
        day_number: day.day_number,
        date: day.date,
        suggested_items: validItems,
      };
    })
  );

  // 4. Calculate route distances for each day
  const enrichedWithDistances = await Promise.all(
    enrichedDays.map(async (day) => {
      // Find hotel + locked items for this day
      const dayLocked = trip_days.find(d => d.day_number === day.day_number);
      const allItems = [...(dayLocked?.locked_items || []), ...day.suggested_items];

      const coordsWithData = allItems.filter(i => i.lat && i.lng);
      if (coordsWithData.length < 2) return day;

      try {
        const distances = await getSequentialDistances(coordsWithData);
        const itemsWithDistances = day.suggested_items.map((item, idx) => ({
          ...item,
          distance_from_prev_km: distances[idx]?.distanceKm || 0,
        }));
        return { ...day, suggested_items: itemsWithDistances };
      } catch {
        return day;
      }
    })
  );

  return enrichedWithDistances;
}

/**
 * Build the Gemini prompt string.
 */
function buildPrompt({ city, country, style, travelers, hotelName, hotelLat, hotelLng, days }) {
  const travelStyleGuide = {
    backpacker: 'budget-friendly, authentic local experiences, street food, hostels, free attractions',
    leisure: 'comfortable mid-range experiences, popular tourist spots, good restaurants, relaxed pace',
    luxury: 'premium experiences, fine dining, 5-star spas, exclusive tours, private transfers',
    family: 'family-friendly activities, kid-safe venues, educational attractions, manageable distances',
  };

  const styleGuide = travelStyleGuide[style] || travelStyleGuide.leisure;

  const lockedItemsText = days.map(day => {
    const locked = day.locked_items?.length
      ? day.locked_items.map(item =>
          `  - [LOCKED] ${item.start_time}–${item.end_time}: ${item.name} at ${item.address || 'address TBD'}`
        ).join('\n')
      : '  (No locked items — fill the entire day)';

    return `Day ${day.day_number} (${day.date}):\n${locked}`;
  }).join('\n\n');

  return `
You are an expert travel planner specializing in optimized, real-world itineraries.

TRIP CONTEXT:
- Destination: ${city}, ${country}
- Travel Style: ${style} (${styleGuide})
- Travelers: ${travelers} person(s)
- Hotel (home base / gravity center): ${hotelName}
- Hotel Coordinates: ${hotelLat}, ${hotelLng}

LOCKED SCHEDULE (DO NOT modify or suggest alternatives to these):
${lockedItemsText}

YOUR TASK:
Fill ONLY the empty time slots between the LOCKED items above with recommended places.
- Keep all suggestions geographically close to the hotel (within 15–20 km, or on the way to locked items)
- Suggest places appropriate for the travel style: ${style}
- Include a mix of: meals (breakfast/lunch/dinner), attractions, and experiences
- Do not suggest anything that would conflict with locked timings
- Ensure realistic travel times between consecutive places
- Suggest popular, well-reviewed places with a good chance of being found on Google Maps
- For "search_query", provide a specific, Googleable search term (e.g., "Seminyak Beach Bali" not just "beach")

Return a JSON response filling in SUGGESTED items only for each day.
`.trim();
}
