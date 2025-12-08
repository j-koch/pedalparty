import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generateVisitorToken } from '$lib/utils';
import type { Vibe, RouteType } from '$lib/database.types';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { id: rideId } = params;
		const body = await request.json();
		const {
			start_location,
			distance_preference_km,
			route_type,
			vibes,
			time_availability,
			visitor_token
		} = body;

		// Validate required fields
		if (!start_location || typeof start_location.lat !== 'number' || typeof start_location.lng !== 'number') {
			return json({ error: 'Valid start location is required' }, { status: 400 });
		}

		if (typeof distance_preference_km !== 'number' || distance_preference_km < 10 || distance_preference_km > 150) {
			return json({ error: 'Distance must be between 10 and 150 km' }, { status: 400 });
		}

		// Verify ride exists
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.select('id')
			.eq('id', rideId)
			.single();

		if (rideError || !ride) {
			return json({ error: 'Ride not found' }, { status: 404 });
		}

		const validRouteTypes: RouteType[] = ['loop', 'out_and_back', 'no_preference'];
		const validVibes: Vibe[] = [
			'coffee_shop', 'scenic_views', 'low_traffic', 'gravel_ok',
			'waterfront', 'minimize_hills', 'maximize_hills'
		];

		const sanitizedRouteType = validRouteTypes.includes(route_type) ? route_type : 'no_preference';
		const sanitizedVibes = Array.isArray(vibes)
			? vibes.filter((v: string) => validVibes.includes(v as Vibe))
			: [];

		// Validate time_availability if provided
		let sanitizedTimeAvailability = null;
		if (time_availability && typeof time_availability === 'object') {
			const { earliest_start, latest_end } = time_availability;
			if (typeof earliest_start === 'string' && typeof latest_end === 'string') {
				// Basic HH:MM format validation
				const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
				if (timeRegex.test(earliest_start) && timeRegex.test(latest_end)) {
					sanitizedTimeAvailability = { earliest_start, latest_end };
				}
			}
		}

		// Check if this visitor already submitted
		if (visitor_token) {
			const { data: existing } = await supabase
				.from('preferences')
				.select('id')
				.eq('ride_id', rideId)
				.eq('visitor_token', visitor_token)
				.single();

			if (existing) {
				// Update existing preference
				const { error: updateError } = await supabase
					.from('preferences')
					.update({
						start_location,
						distance_preference_km,
						route_type: sanitizedRouteType,
						vibes: sanitizedVibes,
						time_availability: sanitizedTimeAvailability,
						submitted_at: new Date().toISOString()
					})
					.eq('id', existing.id);

				if (updateError) {
					console.error('Update error:', updateError);
					return json({ error: 'Failed to update preferences' }, { status: 500 });
				}

				return json({
					message: 'Preferences updated',
					visitor_token
				});
			}
		}

		// Create new preference
		const newVisitorToken = visitor_token || generateVisitorToken();

		const { error: insertError } = await supabase
			.from('preferences')
			.insert({
				ride_id: rideId,
				start_location,
				distance_preference_km,
				route_type: sanitizedRouteType,
				vibes: sanitizedVibes,
				time_availability: sanitizedTimeAvailability,
				visitor_token: newVisitorToken
			});

		if (insertError) {
			console.error('Insert error:', insertError);
			return json({ error: 'Failed to submit preferences' }, { status: 500 });
		}

		return json({
			message: 'Preferences submitted',
			visitor_token: newVisitorToken
		});
	} catch (err) {
		console.error('Error submitting preferences:', err);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
