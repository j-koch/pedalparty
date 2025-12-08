// Database types for Supabase
// These will be auto-generated later, but we define them manually for now

import type { LineString } from 'geojson';

export type RouteType = 'loop' | 'out_and_back' | 'no_preference';
export type RideStatus = 'collecting' | 'generated';

export type Vibe =
	| 'coffee_shop'
	| 'scenic_views'
	| 'low_traffic'
	| 'gravel_ok'
	| 'waterfront'
	| 'minimize_hills'
	| 'maximize_hills';

export interface Ride {
	id: string;
	name: string;
	date: string | null;
	organizer_token: string;
	pin: string;
	created_at: string;
	status: RideStatus;
	generated_routes: GeneratedRoute[] | null;
}

export interface TimeAvailability {
	earliest_start: string; // HH:MM format
	latest_end: string; // HH:MM format
}

export interface Preference {
	id: string;
	ride_id: string;
	start_location: { lat: number; lng: number };
	distance_preference_km: number;
	route_type: RouteType;
	vibes: Vibe[];
	time_availability: TimeAvailability | null;
	submitted_at: string;
	visitor_token: string;
}

export interface GeneratedRoute {
	id: string;
	name: string;
	distance_km: number;
	elevation_gain_m: number | null;
	geometry: LineString;
	matched_vibes: Vibe[];
	pois: POI[];
}

export interface POI {
	name: string;
	type: string;
	lat: number;
	lng: number;
}

// Supabase Database type for type-safe queries
export interface Database {
	public: {
		Tables: {
			rides: {
				Row: Ride;
				Insert: Omit<Ride, 'created_at'> & { created_at?: string };
				Update: Partial<Ride>;
			};
			preferences: {
				Row: Preference;
				Insert: Omit<Preference, 'id' | 'submitted_at'> & { id?: string; submitted_at?: string };
				Update: Partial<Preference>;
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: {
			route_type: RouteType;
			ride_status: RideStatus;
		};
	};
}
