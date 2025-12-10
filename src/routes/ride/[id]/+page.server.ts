import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id } = params;
	const orgToken = url.searchParams.get('org');

	// Fetch the ride
	const { data: ride, error: rideError } = await supabase
		.from('rides')
		.select('*')
		.eq('id', id)
		.single();

	if (rideError || !ride) {
		throw error(404, 'Ride not found');
	}

	// Check if this is the organizer
	const isOrganizer = orgToken === ride.organizer_token;

	// If organizer, fetch preferences summary
	let preferencesSummary = null;
	if (isOrganizer) {
		const { data: preferences } = await supabase
			.from('preferences')
			.select('*')
			.eq('ride_id', id);

		if (preferences && preferences.length > 0) {
			// Calculate summary stats
			const distances = preferences.map((p) => p.distance_preference_km);
			const avgDistance = Math.round(distances.reduce((a, b) => a + b, 0) / distances.length);

			// Aggregate POI selections by category
			const poiByCategory: Record<string, { poi: { id: string; name: string; lat: number; lng: number }; count: number }[]> = {};
			for (const pref of preferences) {
				const selectedPois = pref.selected_pois || [];
				for (const poi of selectedPois) {
					if (!poiByCategory[poi.category]) {
						poiByCategory[poi.category] = [];
					}
					// Find if this POI already exists
					const existing = poiByCategory[poi.category].find((p) => p.poi.id === poi.id);
					if (existing) {
						existing.count++;
					} else {
						poiByCategory[poi.category].push({
							poi: { id: poi.id, name: poi.name, lat: poi.lat, lng: poi.lng },
							count: 1
						});
					}
				}
			}
			// Sort by count descending
			for (const category of Object.keys(poiByCategory)) {
				poiByCategory[category].sort((a, b) => b.count - a.count);
			}

			// Count route types
			const routeTypeCounts: Record<string, number> = {};
			for (const pref of preferences) {
				routeTypeCounts[pref.route_type] = (routeTypeCounts[pref.route_type] || 0) + 1;
			}

			preferencesSummary = {
				count: preferences.length,
				avgDistance,
				poiByCategory,
				routeTypeCounts
			};
		}
	}

	return {
		ride: {
			id: ride.id,
			name: ride.name,
			date: ride.date,
			status: ride.status,
			categories: ride.categories || [],
			generated_routes: ride.generated_routes
		},
		isOrganizer,
		preferencesSummary,
		orgToken: isOrganizer ? orgToken : null
	};
};
