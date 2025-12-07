# PedalParty Design Document

## Overview

PedalParty is a web application that facilitates collaborative route planning for group cycling rides. A ride organizer creates a ride session and shares a unique link with their group. Participants anonymously submit their preferences (start location, distance, route type, desired features), and the system generates optimized route suggestions that balance everyone's input.

**Domain:** pedalparty.app

## Core Principles

- **No user accounts, ever.** Links are the identity/session mechanism.
- **Anonymous participation.** Organizers see aggregate preferences, not individual submissions.
- **Minimal friction.** Click link → enter preferences → done.
- **Free for MVP.** No payment integration initially.

## User Flows

### Flow 1: Organizer Creates a Ride

1. Organizer visits `pedalparty.app`
2. Clicks "Create a Ride"
3. Enters basic ride info:
   - Ride name (e.g., "Saturday Morning Ride")
   - Tentative date/time (optional, just for display)
4. System generates unique ride ID and shareable link
5. Organizer copies link to share in group chat / email

### Flow 2: Participant Submits Preferences

1. Participant clicks shared link (e.g., `pedalparty.app/ride/abc123`)
2. Sees ride name and any context the organizer provided
3. Fills out preference form:
   - **Start location:** Map pin drop or address autocomplete
   - **Preferred distance:** Slider (10-100 km or 5-60 mi, unit toggle)
   - **Route type:** Loop / Out-and-back / No preference
   - **Vibes/features:** Multi-select checkboxes
     - Coffee shop stop
     - Scenic views
     - Low traffic
     - Gravel/unpaved OK
     - Waterfront/river
     - Minimize hills
     - Maximize hills (for the climbers)
4. Clicks "Submit"
5. Sees confirmation: "Preferences submitted! The organizer will share routes when ready."
6. Participant can update their submission by revisiting the same link (use localStorage to detect returning visitor and pre-fill)

### Flow 3: Organizer Generates Routes

1. Organizer revisits their ride link (identified via separate organizer token in URL or localStorage)
2. Sees dashboard:
   - Number of participants who've submitted
   - Aggregate preference summary (e.g., "4 people, avg distance 35km, 3 want coffee, 2 want scenic")
3. Clicks "Generate Routes"
4. System computes 2-3 candidate routes
5. Results displayed:
   - Interactive map showing each route
   - Stats per route: distance, estimated elevation gain, POIs included
   - "Preference match" indicator (which vibes each route satisfies)
6. Organizer can share results page link with group

## Data Model

### Ride

```
rides
├── id: string (nanoid, URL-safe, e.g., "abc123")
├── name: string
├── date_time: timestamp (optional)
├── organizer_token: string (secret, for organizer-only actions)
├── created_at: timestamp
├── status: enum ["collecting", "generated"]
└── generated_routes: jsonb (nullable, populated after generation)
```

### Preference

```
preferences
├── id: uuid
├── ride_id: string (FK to rides)
├── start_location: geography (PostGIS point) or jsonb {lat, lng}
├── distance_preference_km: integer
├── route_type: enum ["loop", "out_and_back", "no_preference"]
├── vibes: text[] (array of selected feature tags)
├── submitted_at: timestamp
└── visitor_token: string (for allowing updates from same browser)
```

## Route Generation Algorithm

### Input Aggregation

1. Collect all preferences for a ride
2. Compute:
   - **Centroid** of all start locations (geographic center)
   - **Median distance** preference
   - **Route type** majority vote (or defer to "loop" if tied)
   - **Vibe scores** (count how many people selected each)

### Route Generation Strategy

For MVP, use a pragmatic approach:

1. **Determine start point:** Use centroid of submitted start locations
2. **Query POIs:** Use Overpass API to find relevant POIs near centroid based on top-voted vibes:
   - `amenity=cafe` for coffee shops
   - `tourism=viewpoint` for scenic
   - `surface=gravel` ways for gravel
   - `bicycle=designated` or `cycleway` for bike infrastructure
3. **Generate candidate routes:**
   - Use OSRM or GraphHopper with bicycle profile
   - For loops: generate circular routes hitting high-value POIs
   - For out-and-back: find interesting destination at half target distance
4. **Score routes** by how well they satisfy aggregate preferences
5. **Return top 2-3** routes with explanations

### Future Enhancements (Post-MVP)

- Elevation data integration (SRTM via OpenTopoData API)
- Strava segment popularity overlay
- "Fairness" optimization (minimize max distance any participant travels to start)
- Weather integration

## Tech Stack

### Frontend

- **Framework:** SvelteKit or Next.js (SvelteKit recommended for simpler mental model)
- **Maps:** Leaflet with OpenStreetMap tiles
- **Styling:** Tailwind CSS
- **Geocoding:** Nominatim (OSM's geocoder) for address autocomplete

### Backend

- **Runtime:** Node.js (via SvelteKit/Next.js API routes) or separate Express server
- **Database:** Supabase (Postgres with PostGIS extension for geo queries)
- **Routing Engine:** 
  - Primary: GraphHopper Directions API (free tier: 500 requests/day)
  - Fallback: Self-hosted OSRM if needed
- **POI Queries:** Overpass API (OSM)

### Infrastructure

- **Hosting:** Vercel (frontend + API routes)
- **Database:** Supabase hosted Postgres
- **Domain:** pedalparty.app (Cloudflare DNS recommended)

## API Endpoints

```
POST /api/rides
  - Creates new ride
  - Body: { name, date_time? }
  - Returns: { ride_id, organizer_token, share_url }

GET /api/rides/[ride_id]
  - Public ride info
  - Returns: { name, date_time, status, participant_count }

GET /api/rides/[ride_id]/dashboard?token=[organizer_token]
  - Organizer view with aggregate stats
  - Returns: { ...ride, preferences_summary, generated_routes? }

POST /api/rides/[ride_id]/preferences
  - Submit or update preferences
  - Body: { start_location, distance_preference_km, route_type, vibes, visitor_token? }
  - Returns: { preference_id, visitor_token }

POST /api/rides/[ride_id]/generate?token=[organizer_token]
  - Trigger route generation
  - Returns: { routes: [...] }
```

## UI Pages

```
/                           - Landing page, "Create a Ride" CTA
/ride/[id]                  - Participant preference form
/ride/[id]?org=[token]      - Organizer dashboard
/ride/[id]/routes           - Generated routes display (public, shareable)
```

## MVP Scope Checklist

### Must Have
- [ ] Landing page with ride creation
- [ ] Unique link generation
- [ ] Preference submission form with map
- [ ] Organizer dashboard showing participant count
- [ ] Basic route generation (even if simplistic)
- [ ] Results page with map display

### Nice to Have (but probably punt)
- [ ] Address autocomplete
- [ ] Preference update detection via localStorage
- [ ] Elevation stats
- [ ] Multiple route options (start with just 1)

### Explicitly Out of Scope
- [ ] User accounts
- [ ] Payment
- [ ] Native mobile apps
- [ ] Real-time updates / WebSockets
- [ ] Social features

## Open Questions

1. **Unit system:** Default to metric with toggle, or detect from browser locale?
2. **Link expiration:** Should rides expire after N days? Probably yes for DB hygiene.
3. **Rate limiting:** How to prevent abuse without accounts? Probably IP-based throttling.
4. **Route caching:** Cache generated routes or regenerate each time?

## Development Phases

### Phase 1: Foundation (Week 1)
- Project setup (SvelteKit + Supabase)
- Database schema
- Ride creation flow
- Basic preference form (no map yet)

### Phase 2: Maps & Geo (Week 2)
- Leaflet map integration
- Start location picker
- Geocoding integration
- Store preferences with geography

### Phase 3: Route Generation (Week 3)
- Overpass API integration for POIs
- GraphHopper/OSRM integration
- Basic route generation algorithm
- Results display

### Phase 4: Polish (Week 4)
- UI/UX improvements
- Mobile responsiveness
- Error handling
- Deploy to production

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, GRAPHHOPPER_API_KEY (optional)

# Run database migrations
npm run db:migrate

# Start dev server
npm run dev
```

## Environment Variables

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
GRAPHHOPPER_API_KEY=xxx (optional, has free tier)
```
