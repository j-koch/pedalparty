import { GRAPHHOPPER_API_KEY } from '$env/static/private';

const GRAPHHOPPER_BASE_URL = 'https://graphhopper.com/api/1';

export interface RoutePoint {
	lat: number;
	lng: number;
}

export interface GraphHopperRoute {
	distance: number; // meters
	time: number; // milliseconds
	ascend: number; // meters
	descend: number; // meters
	points: {
		type: 'LineString';
		coordinates: [number, number][]; // [lng, lat] pairs
	};
	bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export interface GraphHopperResponse {
	paths: GraphHopperRoute[];
	info?: {
		errors?: { message: string }[];
	};
}

/**
 * Get a cycling route between two or more points
 */
export async function getRoute(points: RoutePoint[]): Promise<GraphHopperRoute | null> {
	if (points.length < 2) {
		throw new Error('At least 2 points are required for routing');
	}

	const pointsParam = points.map((p) => `${p.lat},${p.lng}`).join('&point=');

	const url = new URL(`${GRAPHHOPPER_BASE_URL}/route`);
	url.searchParams.set('key', GRAPHHOPPER_API_KEY);
	url.searchParams.set('vehicle', 'bike');
	url.searchParams.set('points_encoded', 'false'); // Get GeoJSON instead of encoded polyline
	url.searchParams.set('elevation', 'true');
	url.searchParams.set('instructions', 'false'); // We don't need turn-by-turn

	// Add points manually since we need multiple 'point' params
	const fullUrl = `${url.toString()}&point=${pointsParam}`;

	try {
		const response = await fetch(fullUrl);
		const data: GraphHopperResponse = await response.json();

		if (data.info?.errors?.length) {
			console.error('GraphHopper error:', data.info.errors);
			return null;
		}

		return data.paths?.[0] ?? null;
	} catch (error) {
		console.error('GraphHopper request failed:', error);
		return null;
	}
}

/**
 * Generate a round trip (loop) route from a starting point
 * Uses GraphHopper's round_trip algorithm
 */
export async function getRoundTripRoute(
	start: RoutePoint,
	distanceKm: number,
	seed?: number
): Promise<GraphHopperRoute | null> {
	const url = new URL(`${GRAPHHOPPER_BASE_URL}/route`);
	url.searchParams.set('key', GRAPHHOPPER_API_KEY);
	url.searchParams.set('point', `${start.lat},${start.lng}`);
	url.searchParams.set('vehicle', 'bike');
	url.searchParams.set('points_encoded', 'false');
	url.searchParams.set('elevation', 'true');
	url.searchParams.set('instructions', 'false');

	// Round trip specific params
	url.searchParams.set('algorithm', 'round_trip');
	url.searchParams.set('round_trip.distance', String(distanceKm * 1000)); // Convert to meters

	if (seed !== undefined) {
		url.searchParams.set('round_trip.seed', String(seed));
	}

	try {
		const response = await fetch(url.toString());
		const data: GraphHopperResponse = await response.json();

		if (data.info?.errors?.length) {
			console.error('GraphHopper round trip error:', data.info.errors);
			return null;
		}

		return data.paths?.[0] ?? null;
	} catch (error) {
		console.error('GraphHopper round trip request failed:', error);
		return null;
	}
}

/**
 * Generate multiple route variations for a round trip
 * Uses different seeds to get varied routes
 */
export async function generateRouteVariations(
	start: RoutePoint,
	distanceKm: number,
	count: number = 3
): Promise<GraphHopperRoute[]> {
	const routes: GraphHopperRoute[] = [];

	for (let i = 0; i < count; i++) {
		const route = await getRoundTripRoute(start, distanceKm, i * 12345);
		if (route) {
			routes.push(route);
		}
	}

	return routes;
}
