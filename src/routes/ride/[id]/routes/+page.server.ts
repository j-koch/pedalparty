import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const { data: ride, error: rideError } = await supabase
		.from('rides')
		.select('*')
		.eq('id', id)
		.single();

	if (rideError || !ride) {
		throw error(404, 'Ride not found');
	}

	if (ride.status !== 'generated' || !ride.generated_routes) {
		throw error(404, 'Routes have not been generated yet');
	}

	return {
		ride: {
			id: ride.id,
			name: ride.name,
			date_time: ride.date_time
		},
		routes: ride.generated_routes
	};
};
