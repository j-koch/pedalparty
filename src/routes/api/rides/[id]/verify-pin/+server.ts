import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { id: rideId } = params;
		const body = await request.json();
		const { pin } = body;

		if (!pin || typeof pin !== 'string') {
			return json({ error: 'PIN is required' }, { status: 400 });
		}

		// Fetch the ride and verify PIN
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.select('id, pin, organizer_token')
			.eq('id', rideId)
			.single();

		if (rideError || !ride) {
			return json({ error: 'Ride not found' }, { status: 404 });
		}

		if (ride.pin !== pin) {
			return json({ error: 'Invalid PIN' }, { status: 401 });
		}

		// PIN is valid, return the organizer URL
		return json({
			organizer_token: ride.organizer_token,
			organizer_url: `/ride/${rideId}?org=${ride.organizer_token}`
		});
	} catch (err) {
		console.error('Error verifying PIN:', err);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
