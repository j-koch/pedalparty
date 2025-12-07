import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { calculateCentroid, median, majorityVote } from '$lib/utils';
import { generateRouteVariations } from '$lib/server/graphhopper';
import { findPOIsForVibes } from '$lib/server/overpass';
import type { Vibe, RouteType, GeneratedRoute } from '$lib/database.types';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ params, url }) => {
	const { id: rideId } = params;
	const token = url.searchParams.get('token');

	if (!token) {
		return json({ error: 'Organizer token required' }, { status: 401 });
	}

	// Verify organizer token
	const { data: ride, error: rideError } = await supabase
		.from('rides')
		.select('*')
		.eq('id', rideId)
		.single();

	if (rideError || !ride) {
		return json({ error: 'Ride not found' }, { status: 404 });
	}

	if (ride.organizer_token !== token) {
		return json({ error: 'Invalid organizer token' }, { status: 403 });
	}

	// Fetch all preferences
	const { data: preferences, error: prefError } = await supabase
		.from('preferences')
		.select('*')
		.eq('ride_id', rideId);

	if (prefError) {
		console.error('Error fetching preferences:', prefError);
		return json({ error: 'Failed to fetch preferences' }, { status: 500 });
	}

	if (!preferences || preferences.length === 0) {
		return json({ error: 'No preferences submitted yet' }, { status: 400 });
	}

	try {
		// Aggregate preferences
		const startLocations = preferences.map((p) => p.start_location as { lat: number; lng: number });
		const centroid = calculateCentroid(startLocations);

		const distances = preferences.map((p) => p.distance_preference_km);
		const targetDistance = median(distances);

		const routeTypes = preferences.map((p) => p.route_type as RouteType);
		const preferredRouteType = majorityVote(routeTypes, 'loop');

		// Count vibes
		const vibeCounts = new Map<Vibe, number>();
		for (const pref of preferences) {
			for (const vibe of pref.vibes as Vibe[]) {
				vibeCounts.set(vibe, (vibeCounts.get(vibe) || 0) + 1);
			}
		}

		// Get top vibes (requested by at least 1 person)
		const topVibes = Array.from(vibeCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([vibe]) => vibe);

		// Generate routes using GraphHopper
		const graphhopperRoutes = await generateRouteVariations(centroid, targetDistance, 2);

		if (graphhopperRoutes.length === 0) {
			return json({ error: 'Could not generate routes for this area' }, { status: 500 });
		}

		// Query POIs if vibes include coffee_shop or scenic_views
		let pois: { name: string; type: string; lat: number; lng: number }[] = [];
		if (topVibes.length > 0) {
			pois = await findPOIsForVibes(centroid.lat, centroid.lng, targetDistance, topVibes);
		}

		// Build generated routes
		const generatedRoutes: GeneratedRoute[] = graphhopperRoutes.map((route, index) => {
			// Convert GraphHopper coordinates [lng, lat] to GeoJSON LineString
			const geometry = {
				type: 'LineString' as const,
				coordinates: route.points.coordinates
			};

			// Find which vibes this route satisfies
			const matchedVibes: Vibe[] = [];

			// Check for elevation-related vibes
			const avgGradient = route.ascend / (route.distance / 1000);
			if (topVibes.includes('minimize_hills') && avgGradient < 10) {
				matchedVibes.push('minimize_hills');
			}
			if (topVibes.includes('maximize_hills') && avgGradient > 15) {
				matchedVibes.push('maximize_hills');
			}

			// Add vibes that we queried POIs for
			if (topVibes.includes('coffee_shop') && pois.some((p) => p.type === 'cafe')) {
				matchedVibes.push('coffee_shop');
			}
			if (topVibes.includes('scenic_views') && pois.some((p) => p.type === 'viewpoint')) {
				matchedVibes.push('scenic_views');
			}

			return {
				id: nanoid(8),
				name: index === 0 ? 'Recommended Route' : `Alternative ${index}`,
				distance_km: Math.round(route.distance / 100) / 10, // Convert to km with 1 decimal
				elevation_gain_m: Math.round(route.ascend),
				geometry,
				matched_vibes: matchedVibes,
				pois: pois.slice(0, 5) // Limit POIs to 5
			};
		});

		// Update ride with generated routes
		const { error: updateError } = await supabase
			.from('rides')
			.update({
				status: 'generated',
				generated_routes: generatedRoutes
			})
			.eq('id', rideId);

		if (updateError) {
			console.error('Error updating ride:', updateError);
			return json({ error: 'Failed to save routes' }, { status: 500 });
		}

		return json({
			routes: generatedRoutes,
			aggregation: {
				centroid,
				targetDistance,
				preferredRouteType,
				topVibes,
				participantCount: preferences.length
			}
		});
	} catch (err) {
		console.error('Route generation error:', err);
		return json({ error: 'Route generation failed' }, { status: 500 });
	}
};
