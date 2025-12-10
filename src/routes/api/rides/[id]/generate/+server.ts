import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { calculateCentroid, median, majorityVote } from '$lib/utils';
import {
	generateRouteVariations,
	getRouteWithWaypoints,
	orderWaypointsTSP
} from '$lib/server/graphhopper';
import type { RouteType, GeneratedRoute, SelectedPOI } from '$lib/database.types';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ params, url }) => {
	const { id: rideId } = params;
	const token = url.searchParams.get('token');

	if (!token) {
		return json({ error: 'Organizer token required' }, { status: 401 });
	}

	// Verify organizer token and get waypoints
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

		// Get organizer's selected waypoints
		const selectedWaypoints = (ride.selected_waypoints || []) as SelectedPOI[];

		let generatedRoutes: GeneratedRoute[];

		if (selectedWaypoints.length > 0) {
			// Generate route through waypoints
			const waypointCoords = selectedWaypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }));
			const route = await getRouteWithWaypoints(centroid, waypointCoords);

			if (!route) {
				return json({ error: 'Could not generate route through waypoints' }, { status: 500 });
			}

			// Order waypoints in the same way as the route
			const orderedWaypoints = orderWaypointsTSP(centroid, waypointCoords);
			const orderedSelectedWaypoints = orderedWaypoints.map((coord) => {
				return selectedWaypoints.find((wp) => wp.lat === coord.lat && wp.lng === coord.lng)!;
			});

			generatedRoutes = [
				{
					id: nanoid(8),
					name: 'Route with Stops',
					distance_km: Math.round(route.distance / 100) / 10,
					elevation_gain_m: Math.round(route.ascend),
					geometry: {
						type: 'LineString' as const,
						coordinates: route.points.coordinates
					},
					waypoints: orderedSelectedWaypoints
				}
			];
		} else {
			// Fall back to round-trip generation when no waypoints
			const graphhopperRoutes = await generateRouteVariations(centroid, targetDistance, 2);

			if (graphhopperRoutes.length === 0) {
				return json({ error: 'Could not generate routes for this area' }, { status: 500 });
			}

			generatedRoutes = graphhopperRoutes.map((route, index) => ({
				id: nanoid(8),
				name: index === 0 ? 'Recommended Route' : `Alternative ${index}`,
				distance_km: Math.round(route.distance / 100) / 10,
				elevation_gain_m: Math.round(route.ascend),
				geometry: {
					type: 'LineString' as const,
					coordinates: route.points.coordinates
				},
				waypoints: []
			}));
		}

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
				waypointCount: selectedWaypoints.length,
				participantCount: preferences.length
			}
		});
	} catch (err) {
		console.error('Route generation error:', err);
		return json({ error: 'Route generation failed' }, { status: 500 });
	}
};
