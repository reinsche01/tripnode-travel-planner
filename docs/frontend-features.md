# TripNode — Frontend Features Specification

## Overview
The frontend is a **React 18 + Vite** SPA styled with **Tailwind CSS**. It follows a Light Mode "Eco-Tech" design philosophy — clean, teal/emerald palette, rounded cards, and a playful drag-and-drop timeline.

---

## Design System

### Color Palette
```css
/* Primary */
--color-teal-500: #14b8a6;
--color-teal-600: #0d9488;
--color-emerald-500: #10b981;

/* Backgrounds */
--color-bg-primary: #f8fafc;    /* Off-white */
--color-bg-card: #ffffff;
--color-bg-subtle: #f1f5f9;

/* Text */
--color-text-primary: #0f172a;
--color-text-secondary: #475569;
--color-text-muted: #94a3b8;

/* Status */
--color-locked: #f59e0b;        /* Amber — locked/anchor items */
--color-suggested: #14b8a6;     /* Teal — AI-suggested items */
--color-hotel: #8b5cf6;         /* Purple — hotel marker */
```

### Typography
- **Font:** Inter (Google Fonts)
- **Headings:** font-semibold, tracking-tight
- **Body:** font-normal, leading-relaxed

### Component Tokens
- **Border radius:** `rounded-2xl` (cards), `rounded-full` (badges/pills)
- **Shadows:** `shadow-sm` (default), `shadow-md` (hover), `shadow-lg` (modals)
- **Transitions:** `transition-all duration-200 ease-in-out`

---

## Pages

### 1. Landing Page (`/`)
**Purpose:** Marketing/welcome page that converts visitors to sign-ups.

**Sections:**
- **Hero:** Animated tagline "Plan Smarter. Travel Better." with a CTA button
- **How It Works:** 3-step illustrated flow (Input → AI Fill → Explore)
- **Features Showcase:** Card grid highlighting the 3 core MVP features
- **Travel Style Selector Preview:** Interactive preview of the 4 travel styles
- **CTA Footer:** Sign up prompt

**Key Components:**
- `HeroSection` — gradient text, animated particles/travel icons
- `FeatureCard` — icon + title + description
- `HowItWorksStep` — numbered steps with connecting line

---

### 2. Auth Pages (`/login`, `/signup`)
**Purpose:** User authentication.

**Design:**
- Split-panel layout: left = form, right = full-height travel photo/illustration
- Clean form with floating label inputs
- Google OAuth button (via Supabase)
- Smooth fade-in animation on load

**Key Components:**
- `AuthForm` — controlled form with validation
- `InputField` — floating label + error state
- `SocialAuthButton` — Google sign-in

---

### 3. Dashboard (`/dashboard`)
**Purpose:** Overview of all user trips.

**Layout:**
- Top stats bar: Total trips, upcoming trips, destinations visited
- Trip cards grid (2 cols on tablet, 3 on desktop)
- Empty state with "Create Your First Trip" CTA
- "New Trip" floating action button

**Key Components:**
- `TripCard` — thumbnail, title, dates, traveler count, status badge, actions menu
- `StatsBar` — animated counter chips
- `EmptyState` — illustration + CTA
- `CreateTripFAB` — floating action button

---

### 4. Trip Creation Wizard (`/trips/new`)
**Purpose:** Multi-step form to configure a new trip.

**Steps:**
1. **Destination & Dates** — City search (autocomplete), date range picker, traveler count
2. **Travel Style** — 4 visual cards (Backpacker 🎒, Leisure 🌴, Luxury 💎, Family 👨‍👩‍👧)
3. **Your Hotel** — Hotel name search with Places autocomplete, auto-geocoding
4. **Must-Visit Anchors** — Add/remove locked places with date + time

**Key Components:**
- `WizardProgress` — step indicator bar
- `DestinationSearch` — Places autocomplete input
- `DateRangePicker` — inline calendar
- `TravelStyleCard` — selectable card with icon + description
- `HotelSearch` — Places autocomplete for hotel
- `AnchorItem` — removable anchor with time inputs
- `AddAnchorButton` — inline add form

---

### 5. Trip Planner / Itinerary Editor (`/trips/:id`)
**Purpose:** The main app screen — view and edit the generated itinerary.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Header: Trip Title | Dates | Share | Export buttons │
├──────────────┬──────────────────────────────────────┤
│  Day Tabs    │                                      │
│  ─────────   │      Timeline / Itinerary Panel      │
│  Day 1       │      (drag-and-drop items)           │
│  Day 2       │                                      │
│  Day 3       │                                      │
│  ...         │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Key Components:**
- `DayTab` — clickable day selector (Day 1, Day 2...)
- `Timeline` — main sortable drag-and-drop list per day
- `TimelineItem` — individual place card (locked or suggested)
- `ItineraryCard` — detailed view with photo, time, distance badge
- `AIGenerateButton` — triggers AI to fill empty slots
- `EditItemModal` — edit time, notes, remove item
- `RouteDistanceBadge` — shows km from previous stop
- `AddCustomPlaceButton` — manually add a place

**Timeline Item States:**
- 🔒 **LOCKED** (amber border) — Hotel or user anchor, cannot be moved
- 🤖 **SUGGESTED** (teal border) — AI recommendation, draggable
- ➕ **EMPTY SLOT** (dashed border) — unfilled time block

---

### 6. Shared Trip View (`/share/:token`)
**Purpose:** Public read-only trip view for collaboration/sharing.

**Features:**
- No auth required
- Read-only timeline (no drag, no edit)
- "Copy to my trips" CTA for logged-in users
- Print-friendly layout

---

## Core UI Components

### `DestinationCard`
```
┌────────────────────────────────┐
│ [Photo]                        │
│ ● 09:00 - 10:30                │
│ Place Name              🔒/🤖  │
│ 📍 1.2 km from previous        │
│ ⭐ 4.5  🕐 Open until 18:00   │
│ Notes: Great for sunrise...    │
└────────────────────────────────┘
```

### `TimelineConnector`
- Vertical line between cards
- Shows travel time + distance
- Color: teal for walking, blue for driving

### `AIStatusBanner`
- Shows when AI is generating: animated dots + "Filling your schedule..."
- On success: "✓ AI added 8 places to your itinerary"
- On error: "⚠ Could not reach AI. Try again."

### `PlacePhotoGallery`
- Horizontal scrollable row of place photos
- Lazy loaded via IntersectionObserver

---

## State Management (Zustand)

### Stores:
```
authStore
  - user: UserProfile | null
  - isLoading: boolean
  - login(), logout(), signup()

tripStore
  - trips: Trip[]
  - currentTrip: Trip | null
  - fetchTrips(), fetchTrip(id), createTrip(), updateTrip()

itineraryStore
  - days: TripDay[]
  - activeDay: number
  - items: ItineraryItem[]
  - isGenerating: boolean
  - generateAI(), reorderItems(), updateItem(), removeItem()

uiStore
  - isModalOpen: boolean
  - activeModal: string | null
  - toast: ToastMessage | null
```

---

## Drag & Drop (dnd-kit)

### Behavior:
- Items within a day are reorderable
- LOCKED items (hotel, anchors) are NOT draggable (but can be dragged over)
- On drop: `PUT /api/trips/:id/reorder` called to persist new order
- After reorder: distances recalculated and badges update smoothly
- Drag overlay: Ghost card follows cursor with slight rotation + scale
- Drop zone: Teal highlight with dotted border on valid targets

### Drag Animation:
```css
/* While dragging */
transform: rotate(2deg) scale(1.05);
box-shadow: 0 20px 40px rgba(0,0,0,0.2);

/* Drop zone active */
border: 2px dashed #14b8a6;
background: rgba(20, 184, 166, 0.05);
```

---

## PDF Export

- Triggered client-side using `html2canvas` + `jsPDF`
- Hidden print layout div rendered off-screen
- PDF layout: Cover page + one page per day
- Includes: place names, times, addresses, notes, total distance

---

## Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, bottom nav |
| Tablet (640-1024px) | 2-col: day tabs + timeline |
| Desktop (> 1024px) | 3-col: days + timeline + detail panel |

---

## Micro-Animations

| Element | Animation |
|---------|-----------|
| Page transitions | Fade + slide up (200ms) |
| Card hover | `translateY(-2px)` + shadow deepen |
| Button click | `scale(0.97)` press effect |
| AI generating | Skeleton shimmer + pulsing dots |
| New item added | Slide in from right + fade in |
| Item removed | Slide out left + fade out |
| Drag | Rotation + lift shadow |
| Toast notifications | Slide in from bottom-right |

---

## Accessibility

- All interactive elements have `aria-label`
- Keyboard navigation for drag-and-drop (dnd-kit built-in)
- Color contrast meets WCAG AA (4.5:1 ratio)
- Focus rings visible (`focus:ring-2 focus:ring-teal-500`)
- Loading states announced via `aria-live="polite"`
