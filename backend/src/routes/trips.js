import express from 'express';
import { nanoid } from 'nanoid';
import supabase from '../utils/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { createError } from '../middleware/errorHandler.js';
import { searchPlace } from '../services/placesService.js';
import { generateItinerary } from '../services/geminiService.js';
import { getSequentialDistances } from '../services/osrmService.js';

const router = express.Router();

// ─── GET /api/trips — List user trips ────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_days(count)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return next(createError(500, error.message, 'DB_ERROR'));
    res.json({ trips: data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/trips/:id — Get full trip detail ─────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        *,
        trip_days(
          *,
          itinerary_items(* order by sort_order asc)
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !trip) return next(createError(404, 'Trip not found.', 'NOT_FOUND'));

    res.json({ trip });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/trips — Create new trip ────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      title, destination_city, destination_country,
      start_date, end_date, traveler_count, travel_style,
      hotel_name, hotel_address,
    } = req.body;

    // Validation
    if (!destination_city || !start_date || !end_date || !hotel_name) {
      return next(createError(400, 'destination_city, start_date, end_date, and hotel_name are required.', 'VALIDATION_ERROR'));
    }

    // Resolve hotel coordinates
    let hotelLat = null, hotelLng = null, resolvedAddress = hotel_address;
    try {
      const hotelData = await searchPlace(hotel_name + ' ' + (hotel_address || destination_city));
      if (hotelData) {
        hotelLat = hotelData.lat;
        hotelLng = hotelData.lng;
        resolvedAddress = hotelData.address || hotel_address;
      }
    } catch {
      console.warn('[Trips] Could not geocode hotel, proceeding without coordinates.');
    }

    // Create trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id: req.user.id,
        title: title || `Trip to ${destination_city}`,
        destination_city,
        destination_country: destination_country || '',
        start_date,
        end_date,
        traveler_count: traveler_count || 1,
        travel_style: travel_style || 'leisure',
        hotel_name,
        hotel_lat: hotelLat,
        hotel_lng: hotelLng,
        hotel_address: resolvedAddress,
        status: 'draft',
      })
      .select()
      .single();

    if (tripError) return next(createError(500, tripError.message, 'DB_ERROR'));

    // Create trip_days for each day
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        trip_id: trip.id,
        day_number: days.length + 1,
        date: d.toISOString().split('T')[0],
      });
    }

    if (days.length > 0) {
      const { error: daysError } = await supabase.from('trip_days').insert(days);
      if (daysError) console.error('[Trips] Failed to create trip_days:', daysError.message);
    }

    // Add hotel as first item of Day 1
    const { data: day1 } = await supabase
      .from('trip_days')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('day_number', 1)
      .single();

    if (day1 && hotelLat) {
      await supabase.from('itinerary_items').insert({
        trip_day_id: day1.id,
        trip_id: trip.id,
        name: hotel_name,
        type: 'hotel',
        status: 'locked',
        lat: hotelLat,
        lng: hotelLng,
        address: resolvedAddress,
        start_time: '07:00',
        end_time: '08:00',
        sort_order: 0,
      });
    }

    res.status(201).json({ message: 'Trip created successfully.', trip });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/trips/:id — Update trip ────────────────────────────────────────
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const allowed = ['title', 'traveler_count', 'travel_style', 'status'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) return next(createError(404, 'Trip not found.', 'NOT_FOUND'));
    res.json({ trip: data });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/trips/:id ────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return next(createError(404, 'Trip not found.', 'NOT_FOUND'));
    res.json({ message: 'Trip deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/trips/:id/anchors — Add a locked anchor ───────────────────────
router.post('/:id/anchors', authenticate, async (req, res, next) => {
  try {
    const { day_number, name, address, start_time, end_time, notes } = req.body;
    if (!day_number || !name || !start_time || !end_time) {
      return next(createError(400, 'day_number, name, start_time, and end_time are required.', 'VALIDATION_ERROR'));
    }

    // Get the trip day
    const { data: day } = await supabase
      .from('trip_days')
      .select('id')
      .eq('trip_id', req.params.id)
      .eq('day_number', day_number)
      .single();

    if (!day) return next(createError(404, 'Trip day not found.', 'NOT_FOUND'));

    // Resolve place coordinates
    let placeData = null;
    try {
      placeData = await searchPlace(name + ' ' + (address || ''));
    } catch { /* proceed without coords */ }

    // Get next sort_order
    const { data: existingItems } = await supabase
      .from('itinerary_items')
      .select('sort_order')
      .eq('trip_day_id', day.id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existingItems?.[0]?.sort_order ?? -1) + 1;

    const { data: item, error } = await supabase
      .from('itinerary_items')
      .insert({
        trip_day_id: day.id,
        trip_id: req.params.id,
        name,
        type: 'anchor',
        status: 'locked',
        lat: placeData?.lat || null,
        lng: placeData?.lng || null,
        address: placeData?.address || address || null,
        photo_url: placeData?.photo_url || null,
        start_time,
        end_time,
        notes: notes || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) return next(createError(500, error.message, 'DB_ERROR'));
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/trips/:id/generate — AI Itinerary Generation ──────────────────
router.post('/:id/generate', authenticate, aiRateLimiter, async (req, res, next) => {
  try {
    // Fetch full trip with days and locked items
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        trip_days(
          *,
          itinerary_items(* order by sort_order asc)
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (tripError || !trip) return next(createError(404, 'Trip not found.', 'NOT_FOUND'));

    // Prepare days with locked_items for the prompt
    const daysWithLocked = trip.trip_days.map(day => ({
      day_number: day.day_number,
      date: day.date,
      locked_items: day.itinerary_items.filter(i => i.status === 'locked'),
    }));

    const tripForAI = { ...trip, trip_days: daysWithLocked };

    // Call Gemini service
    const enrichedDays = await generateItinerary(tripForAI);

    // Delete old suggested items
    await supabase
      .from('itinerary_items')
      .delete()
      .eq('trip_id', trip.id)
      .eq('status', 'suggested');

    // Insert new suggested items
    const itemsToInsert = [];
    for (const day of enrichedDays) {
      const tripDay = trip.trip_days.find(d => d.day_number === day.day_number);
      if (!tripDay) continue;

      const lockedCount = tripDay.itinerary_items.filter(i => i.status === 'locked').length;

      day.suggested_items.forEach((item, idx) => {
        itemsToInsert.push({
          trip_day_id: tripDay.id,
          trip_id: trip.id,
          place_id: item.place_id || null,
          name: item.name,
          type: 'suggested',
          status: 'suggested',
          category: item.category || null,
          lat: item.lat || null,
          lng: item.lng || null,
          address: item.address || null,
          photo_url: item.photo_url || null,
          start_time: item.start_time,
          end_time: item.end_time,
          duration_minutes: item.duration_minutes || null,
          distance_from_prev_km: item.distance_from_prev_km || null,
          notes: item.notes || null,
          sort_order: lockedCount + idx,
        });
      });
    }

    if (itemsToInsert.length > 0) {
      await supabase.from('itinerary_items').insert(itemsToInsert);
    }

    // Return updated full trip
    const { data: updatedTrip } = await supabase
      .from('trips')
      .select(`
        *,
        trip_days(
          *,
          itinerary_items(* order by sort_order asc)
        )
      `)
      .eq('id', trip.id)
      .single();

    res.json({
      message: `AI generated ${itemsToInsert.length} suggestions.`,
      trip: updatedTrip,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/trips/:id/reorder — Reorder items after drag ────────────────────
router.put('/:id/reorder', authenticate, async (req, res, next) => {
  try {
    const { day_id, items } = req.body; // items: [{id, sort_order}]
    if (!day_id || !Array.isArray(items)) {
      return next(createError(400, 'day_id and items array required.', 'VALIDATION_ERROR'));
    }

    // Update sort orders in batch
    const updates = items.map(({ id, sort_order }) =>
      supabase.from('itinerary_items').update({ sort_order }).eq('id', id).eq('trip_id', req.params.id)
    );
    await Promise.all(updates);

    // Recalculate distances
    const { data: updatedItems } = await supabase
      .from('itinerary_items')
      .select('id, lat, lng')
      .eq('trip_day_id', day_id)
      .order('sort_order', { ascending: true });

    const coordItems = updatedItems.filter(i => i.lat && i.lng);
    if (coordItems.length >= 2) {
      const distances = await getSequentialDistances(coordItems);
      await Promise.all(
        coordItems.map((item, idx) =>
          supabase
            .from('itinerary_items')
            .update({ distance_from_prev_km: distances[idx]?.distanceKm || 0 })
            .eq('id', item.id)
        )
      );
    }

    res.json({ message: 'Items reordered successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/trips/:id/items/:itemId — Update single item ───────────────────
router.put('/:id/items/:itemId', authenticate, async (req, res, next) => {
  try {
    const allowed = ['notes', 'start_time', 'end_time', 'status'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const { data, error } = await supabase
      .from('itinerary_items')
      .update(updates)
      .eq('id', req.params.itemId)
      .eq('trip_id', req.params.id)
      .select()
      .single();

    if (error || !data) return next(createError(404, 'Item not found.', 'NOT_FOUND'));
    res.json({ item: data });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/trips/:id/items/:itemId ──────────────────────────────────────
router.delete('/:id/items/:itemId', authenticate, async (req, res, next) => {
  try {
    // Check it's not a locked item before deleting
    const { data: item } = await supabase
      .from('itinerary_items')
      .select('status, type')
      .eq('id', req.params.itemId)
      .eq('trip_id', req.params.id)
      .single();

    if (!item) return next(createError(404, 'Item not found.', 'NOT_FOUND'));
    if (item.type === 'hotel') {
      return next(createError(400, 'Cannot remove the hotel item.', 'FORBIDDEN_ACTION'));
    }

    await supabase.from('itinerary_items').delete().eq('id', req.params.itemId);
    res.json({ message: 'Item removed.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/trips/:id/share — Generate share link ─────────────────────────
router.post('/:id/share', authenticate, async (req, res, next) => {
  try {
    const token = nanoid(12);
    const { data, error } = await supabase
      .from('trips')
      .update({ share_token: token })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, share_token')
      .single();

    if (error || !data) return next(createError(404, 'Trip not found.', 'NOT_FOUND'));

    const shareUrl = `${process.env.FRONTEND_URL}/share/${token}`;
    res.json({ shareUrl, token });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/trips/share/:token — Public read-only trip ─────────────────────
router.get('/share/:token', async (req, res, next) => {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        id, title, destination_city, destination_country,
        start_date, end_date, traveler_count, travel_style,
        trip_days(
          *,
          itinerary_items(* order by sort_order asc)
        )
      `)
      .eq('share_token', req.params.token)
      .single();

    if (error || !trip) return next(createError(404, 'Shared trip not found.', 'NOT_FOUND'));
    res.json({ trip });
  } catch (err) {
    next(err);
  }
});

export default router;
