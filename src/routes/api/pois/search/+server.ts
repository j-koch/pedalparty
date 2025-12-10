import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchPOIs } from '$lib/server/poi-search';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	const lat = url.searchParams.get('lat');
	const lng = url.searchParams.get('lng');
	const limit = url.searchParams.get('limit');

	if (!query) {
		return json({ error: 'Query parameter "q" is required' }, { status: 400 });
	}

	if (!lat || !lng) {
		return json({ error: 'Location parameters "lat" and "lng" are required' }, { status: 400 });
	}

	const latNum = parseFloat(lat);
	const lngNum = parseFloat(lng);

	if (isNaN(latNum) || isNaN(lngNum)) {
		return json({ error: 'Invalid lat/lng values' }, { status: 400 });
	}

	const limitNum = limit ? parseInt(limit, 10) : 5;

	try {
		const results = await searchPOIs(query, latNum, lngNum, limitNum);
		return json({ results });
	} catch (err) {
		console.error('POI search error:', err);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
