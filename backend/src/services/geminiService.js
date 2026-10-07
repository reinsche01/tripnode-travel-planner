import { GoogleGenAI } from '@google/genai';
import { searchPlace, isCurrentlyOpen } from './placesService.js';
import { getSequentialDistances } from './osrmService.js';

/**
 * Robustly extract a JSON object from a model response string.
 */
function extractJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text.trim()); } catch { }
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { }
  }
  return null;
}

/**
 * Call Google Gemini API, falling back through modelQueue on failure.
 */
async function callGemini(systemPrompt, userPrompt, modelQueue) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY is not set in environment variables.');
  const ai = new GoogleGenAI({ apiKey });
  let lastError;

  for (const modelName of modelQueue) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini] Trying model: ${modelName} (attempt ${attempt})`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        });
        const text = response.text;
        if (!text) throw new Error('Gemini returned empty content.');
        const parsed = extractJSON(text);
        if (!parsed) {
          console.error('[Gemini] Could not extract JSON. Raw (300 chars):', text.slice(0, 300));
          throw new Error('Gemini returned invalid JSON.');
        }
        console.log(`[Gemini] Success with model: ${modelName}`);
        return parsed;
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        const isUnavailable = msg.includes('not found') || msg.includes('404') ||
          msg.includes('does not exist') || msg.includes('PERMISSION_DENIED') ||
          msg.includes('not supported') || msg.includes('invalid model') ||
          msg.includes('no longer available');
        const isOverloaded = msg.includes('503') || msg.includes('overloaded') ||
          msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota') ||
          msg.includes('high demand');
        if (isUnavailable) {
          console.warn(`[Gemini] Model ${modelName} unavailable -> trying next...`);
          break;
        }
        if (isOverloaded && attempt < 3) {
          const wait = attempt * 5000; // 5s, 10s
          console.warn(`[Gemini] Model ${modelName} busy — retrying in ${wait / 1000}s... (${attempt}/3)`);
          await new Promise(res => setTimeout(res, wait));
        } else {
          console.warn(`[Gemini] Model ${modelName} failed (${msg.slice(0, 80)}) -> next...`);
          break;
        }
      }
    }
  }
  throw lastError || new Error('All Gemini models are currently unavailable.');
}

/**
 * Generate AI-powered itinerary suggestions.
 */
export async function generateItinerary(tripData) {
  const {
    destination_city, destination_country, travel_style,
    traveler_count, hotel_name, hotel_lat, hotel_lng, trip_days,
  } = tripData;

  const prompt = buildPrompt({
    city: destination_city, country: destination_country,
    style: travel_style, travelers: traveler_count,
    hotelName: hotel_name, hotelLat: hotel_lat, hotelLng: hotel_lng,
    days: trip_days,
  });

  console.log('[AI] Generating itinerary for:', destination_city, 'via Google Gemini API');

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const fallbackRaw = process.env.GEMINI_FALLBACK_MODELS || 'gemini-1.5-flash-8b,gemini-2.0-flash';
  const modelQueue = [primaryModel, ...fallbackRaw.split(',').map(m => m.trim()).filter(m => m !== primaryModel)];

  const systemPrompt = `You are an expert travel planner. Always respond with valid JSON only — no markdown, no explanation, just the raw JSON object matching the structure: { "days": [ { "day_number": 1, "date": "YYYY-MM-DD", "suggested_items": [ { "name": "...", "category": "food|culture|nature|shopping|entertainment|wellness", "start_time": "HH:MM", "end_time": "HH:MM", "duration_minutes": 90, "search_query": "...", "notes": "...", "why_recommended": "..." } ] } ] }`;

  let parsed;
  try {
    parsed = await callGemini(systemPrompt, prompt, modelQueue);
  } catch (err) {
    throw new Error(`AI generation failed: ${err.message}`);
  }

  if (!parsed.days || !Array.isArray(parsed.days)) {
    throw new Error('AI returned unexpected structure. Expected { days: [...] }.');
  }

  // Enrich each item with Places data
  const enrichedDays = await Promise.all(
    parsed.days.map(async (day) => {
      const enrichedItems = await Promise.all(
        day.suggested_items.map(async (item) => {
          try {
            const placeData = await searchPlace(item.search_query, hotel_lat, hotel_lng);
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
            return { ...item, status: 'suggested', type: 'suggested' };
          }
        })
      );
      return {
        day_number: day.day_number,
        date: day.date,
        suggested_items: enrichedItems.filter(Boolean),
      };
    })
  );

  // Calculate route distances for each day
  const enrichedWithDistances = await Promise.all(
    enrichedDays.map(async (day) => {
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
        `  - [LOCKED] ${item.start_time}-${item.end_time}: ${item.name} at ${item.address || 'address TBD'}`
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
- Hotel (home base): ${hotelName}
- Hotel Coordinates: ${hotelLat}, ${hotelLng}

LOCKED SCHEDULE (DO NOT modify):
${lockedItemsText}

YOUR TASK:
Fill ONLY the empty time slots between LOCKED items with recommended places.
- Keep suggestions within 15-20 km of the hotel
- Match the travel style: ${style}
- Include meals (breakfast/lunch/dinner), attractions, and experiences
- Do not conflict with locked timings
- Ensure realistic travel times between places
- Use specific, Googleable search_query values (e.g., "Seminyak Beach Bali" not just "beach")

Return a JSON response with SUGGESTED items only for each day.
`.trim();
}
