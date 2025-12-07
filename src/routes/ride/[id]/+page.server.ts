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

			// Count vibes
			const vibeCounts: Record<string, number> = {};
			for (const pref of preferences) {
				for (const vibe of pref.vibes) {
					vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
				}
			}

			// Count route types
			const routeTypeCounts: Record<string, number> = {};
			for (const pref of preferences) {
				routeTypeCounts[pref.route_type] = (routeTypeCounts[pref.route_type] || 0) + 1;
			}

			preferencesSummary = {
				count: preferences.length,
				avgDistance,
				vibeCounts,
				routeTypeCounts
			};
		}
	}

	return {
		ride: {
			id: ride.id,
			name: ride.name,
			date_time: ride.date_time,
			status: ride.status,
			generated_routes: ride.generated_routes
		},
		isOrganizer,
		preferencesSummary,
		orgToken: isOrganizer ? orgToken : null
	};
};
