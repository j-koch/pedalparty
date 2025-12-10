import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { SelectedPOI } from '$lib/database.types';

export const POST: RequestHandler = async ({ params, request, url }) => {
	try {
		const { id: rideId } = params;
		const token = url.searchParams.get('token');

		if (!token) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify organizer token
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.select('organizer_token')
			.eq('id', rideId)
			.single();

		if (rideError || !ride) {
			return json({ error: 'Ride not found' }, { status: 404 });
		}

		if (ride.organizer_token !== token) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { waypoints } = body;

		// Validate waypoints
		const validWaypoints: SelectedPOI[] = Array.isArray(waypoints)
			? waypoints.filter((wp: unknown): wp is SelectedPOI => {
					if (typeof wp !== 'object' || wp === null) return false;
					const w = wp as Record<string, unknown>;
					return (
						typeof w.id === 'string' &&
						typeof w.name === 'string' &&
						typeof w.category === 'string' &&
						typeof w.lat === 'number' &&
						typeof w.lng === 'number'
					);
				})
			: [];

		// Update ride with selected waypoints
		const { error: updateError } = await supabase
			.from('rides')
			.update({ selected_waypoints: validWaypoints })
			.eq('id', rideId);

		if (updateError) {
			console.error('Update error:', updateError);
			return json({ error: 'Failed to save waypoints' }, { status: 500 });
		}

		return json({ message: 'Waypoints saved', waypoints: validWaypoints });
	} catch (err) {
		console.error('Error saving waypoints:', err);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
