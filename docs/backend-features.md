# TripNode — Backend Features Specification

## Overview
The backend is a **Node.js + Express.js** REST API server that acts as the brain of TripNode, orchestrating all AI calls, third-party APIs, database operations, and business logic.

---

## 1. Authentication & Authorization

### 1.1 User Registration
- **Endpoint:** `POST /api/auth/signup`
- **Flow:** Creates a user in Supabase Auth → stores profile in `users` table
- **Validation:** Email format, password strength (min 8 chars)
- **Response:** JWT token + user profile

### 1.2 User Login
- **Endpoint:** `POST /api/auth/login`
- **Flow:** Supabase Auth validates credentials → returns JWT
- **Response:** JWT token + user profile

### 1.3 Auth Middleware
- Every protected route validates the `Authorization: Bearer <token>` header
- Uses Supabase JWT verification
- Attaches `req.user` to the request object

---

## 2. Trip Management

### 2.1 Create Trip
- **Endpoint:** `POST /api/trips`
- **Body:**
  ```json
  {
    "title": "Bali Adventure",
    "destination_city": "Bali",
    "destination_country": "Indonesia",
    "start_date": "2025-03-15",
    "end_date": "2025-03-20",
    "traveler_count": 2,
    "travel_style": "leisure",
    "hotel_name": "Kuta Beach Hotel",
    "hotel_address": "Jl. Pantai Kuta No. 1"
  }
  ```
- **Flow:**
  1. Geocode hotel address via Google Places API (or cache)
  2. Create trip record in DB
  3. Create `trip_days` records for each day
  4. Return full trip object

### 2.2 Get User Trips
- **Endpoint:** `GET /api/trips`
- **Returns:** Paginated list of trips owned by the authenticated user

### 2.3 Get Trip Detail
- **Endpoint:** `GET /api/trips/:id`
- **Returns:** Full trip with all days and itinerary items (ordered by day + sort_order)

### 2.4 Update Trip
- **Endpoint:** `PUT /api/trips/:id`
- **Allows:** Updating title, dates, traveler count, travel style

### 2.5 Delete Trip
- **Endpoint:** `DELETE /api/trips/:id`
- **Cascade:** Deletes all associated trip_days and itinerary_items

---

## 3. Anchor Management

### 3.1 Add Anchor (Must-Visit Place)
- **Endpoint:** `POST /api/trips/:id/anchors`
- **Body:**
  ```json
  {
    "day_number": 2,
    "name": "Coldplay Concert",
    "address": "GBK Stadium, Jakarta",
    "start_time": "19:00",
    "end_time": "22:00",
    "notes": "Gate opens at 17:00"
  }
  ```
- **Flow:**
  1. Resolve place via Google Places or user-provided data
  2. Create item with `status: "locked"`, `type: "anchor"`
  3. Return updated day itinerary

### 3.2 Remove Anchor
- **Endpoint:** `DELETE /api/trips/:id/items/:itemId`
- Only works on `status: "locked"` items

---

## 4. AI Itinerary Generation (Core Feature)

### 4.1 Generate Itinerary
- **Endpoint:** `POST /api/trips/:id/generate`
- **Flow:**
  1. Fetch all locked items (hotel + anchors) from DB
  2. Calculate empty time slots per day
  3. Build structured Gemini prompt with:
     - Trip context (city, style, travelers, dates)
     - Hotel as gravity center (lat/lng)
     - Locked items with their times
     - Empty slots to fill
  4. Call Gemini API with `response_mime_type: "application/json"` for structured output
  5. Validate returned JSON against schema
  6. For each suggested place: call Google Places API (with cache) for validation + photo
  7. Check opening hours validity
  8. Call OSRM for distance calculations between all items
  9. Save all suggested items to DB with `status: "suggested"`
  10. Return complete itinerary

### 4.2 Gemini Prompt Structure
```
You are a travel planning expert. Generate a detailed day-by-day itinerary for:
- Destination: {city}, {country}
- Travel Style: {style}
- Travelers: {count} people
- Hotel (gravity center): {hotel_name} at {lat},{lng}
- Dates: {start_date} to {end_date}

LOCKED items (DO NOT modify these):
{locked_items_json}

TASK: Fill the empty time slots ONLY. Suggest nearby places within efficient routing distance from the hotel. Return ONLY valid JSON matching this schema:
{json_schema}
```

### 4.3 Gemini Response Schema
```json
{
  "days": [
    {
      "day_number": 1,
      "date": "2025-03-15",
      "suggested_items": [
        {
          "name": "Tanah Lot Temple",
          "category": "culture",
          "start_time": "08:00",
          "end_time": "10:00",
          "duration_minutes": 120,
          "search_query": "Tanah Lot Temple Bali",
          "notes": "Best visited at sunrise"
        }
      ]
    }
  ]
}
```

---

## 5. Google Places Integration

### 5.1 Place Search & Resolution
- **Endpoint:** `GET /api/places/search?query=&lat=&lng=`
- **Flow:**
  1. Check `places_cache` table by name similarity
  2. If cache miss → call Google Places Text Search API
  3. Fetch Place Details (opening_hours, photo, rating)
  4. Store in `places_cache` with 30-day TTL
  5. Return normalized place object

### 5.2 Place Autocomplete (Frontend)
- **Endpoint:** `GET /api/places/autocomplete?input=&location=`
- Used in hotel and anchor input forms
- Results cached for 1 hour

### 5.3 Photo URL Resolution
- Google Places photos stored as references
- Backend constructs full photo URL with API key
- Photo URL stored in cache (no re-fetching)

---

## 6. Route Optimization (OSRM)

### 6.1 Distance Matrix
- **Endpoint:** `POST /api/routes/matrix`
- **Flow:**
  1. Extract lat/lng of all itinerary items for a day
  2. Call OSRM Table API: `GET /table/v1/driving/{coords}`
  3. Returns distance and duration matrix
  4. Update `distance_from_prev_km` on each item

### 6.2 Ordered Route
- **Endpoint:** `POST /api/routes/optimize`
- Given a list of coordinates, returns the optimal visiting order
- Uses OSRM Trip API for TSP (Traveling Salesman Problem) approximation

---

## 7. Itinerary Item Management

### 7.1 Reorder Items (After Drag & Drop)
- **Endpoint:** `PUT /api/trips/:id/reorder`
- **Body:**
  ```json
  {
    "day_id": "uuid",
    "items": [
      { "id": "uuid", "sort_order": 0 },
      { "id": "uuid", "sort_order": 1 }
    ]
  }
  ```
- After reorder: recalculates distances via OSRM

### 7.2 Update Item
- **Endpoint:** `PUT /api/trips/:id/items/:itemId`
- Allows editing: notes, start_time, end_time, status (lock/unlock)

### 7.3 Remove Suggested Item
- **Endpoint:** `DELETE /api/trips/:id/items/:itemId`
- Only `status: "suggested"` items can be deleted (locked = anchors)

---

## 8. Export & Sharing

### 8.1 PDF Export
- **Endpoint:** `GET /api/trips/:id/export/pdf`
- Generates a print-ready itinerary PDF using PDFKit
- Includes: trip title, day-by-day schedule, place photos, map link

### 8.2 Share Link
- **Endpoint:** `POST /api/trips/:id/share`
- Generates a unique `share_token` (nanoid)
- **Public Route:** `GET /api/trips/share/:token` — no auth required
- Returns a read-only trip view

---

## 9. Error Handling

All errors follow this format:
```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not your resource) |
| 404 | Not Found |
| 429 | Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | External API unavailable |

---

## 10. Rate Limiting

- **Global:** 100 requests per 15 minutes per IP
- **AI endpoints:** 10 requests per hour per user (to control Gemini costs)
- **Places search:** 30 requests per minute per user

---

## 11. Middleware Stack

```
Request → CORS → Helmet (security headers) → Rate Limiter
       → JSON body parser → Auth (protected routes)
       → Route handlers → Error handler → Response
```
