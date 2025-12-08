import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generateRideId, generateOrganizerToken, generatePin } from '$lib/utils';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, date } = body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Ride name is required' }, { status: 400 });
		}

		const rideId = generateRideId();
		const organizerToken = generateOrganizerToken();
		const pin = generatePin();

		const { data, error } = await supabase
			.from('rides')
			.insert({
				id: rideId,
				name: name.trim(),
				date: date || null,
				organizer_token: organizerToken,
				pin,
				status: 'collecting',
				generated_routes: null
			})
			.select()
			.single();

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: 'Failed to create ride' }, { status: 500 });
		}

		return json({
			ride_id: data.id,
			organizer_token: organizerToken,
			pin,
			share_url: `/ride/${data.id}`,
			organizer_url: `/ride/${data.id}?org=${organizerToken}`
		});
	} catch (err) {
		console.error('Error creating ride:', err);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
