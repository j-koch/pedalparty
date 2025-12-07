import type { Vibe, POI } from '$lib/database.types';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
	type: 'node' | 'way' | 'relation';
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

interface OverpassResponse {
	elements: OverpassElement[];
}

/**
 * Map vibes to Overpass API query filters
 */
const VIBE_TO_OVERPASS: Record<Vibe, string | null> = {
	coffee_shop: 'node["amenity"="cafe"]',
	scenic_views: 'node["tourism"="viewpoint"]',
	low_traffic: null, // Not directly queryable via POIs
	gravel_ok: null, // Road surface, not a POI
	waterfront: 'way["natural"="water"]', // Lakes, rivers near route
	minimize_hills: null, // Elevation data, not POIs
	maximize_hills: null // Elevation data, not POIs
};

/**
 * Build bounding box string for Overpass query
 * Expands the center point by the given radius in km
 */
function buildBoundingBox(
	centerLat: number,
	centerLng: number,
	radiusKm: number
): string {
	// Approximate degrees per km
	const latDelta = radiusKm / 111;
	const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

	const south = centerLat - latDelta;
	const north = centerLat + latDelta;
	const west = centerLng - lngDelta;
	const east = centerLng + lngDelta;

	return `${south},${west},${north},${east}`;
}

/**
 * Query POIs for specific vibes within a radius of a center point
 */
export async function queryPOIsForVibes(
	centerLat: number,
	centerLng: number,
	radiusKm: number,
	vibes: Vibe[]
): Promise<POI[]> {
	const queryableVibes = vibes.filter((v) => VIBE_TO_OVERPASS[v] !== null);

	if (queryableVibes.length === 0) {
		return [];
	}

	const bbox = buildBoundingBox(centerLat, centerLng, radiusKm);

	// Build Overpass query for all requested POI types
	const queries = queryableVibes
		.map((vibe) => {
			const filter = VIBE_TO_OVERPASS[vibe];
			return `${filter}(${bbox});`;
		})
		.join('\n');

	const overpassQuery = `
		[out:json][timeout:25];
		(
			${queries}
		);
		out center;
	`;

	try {
		const response = await fetch(OVERPASS_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `data=${encodeURIComponent(overpassQuery)}`
		});

		if (!response.ok) {
			console.error('Overpass API error:', response.status, response.statusText);
			return [];
		}

		const data: OverpassResponse = await response.json();

		return data.elements
			.filter((el) => {
				// Must have coordinates
				const lat = el.lat ?? el.center?.lat;
				const lon = el.lon ?? el.center?.lon;
				return lat !== undefined && lon !== undefined;
			})
			.map((el) => {
				const lat = el.lat ?? el.center!.lat;
				const lng = el.lon ?? el.center!.lon;
				const name = el.tags?.name ?? el.tags?.amenity ?? el.tags?.tourism ?? 'Unknown';
				const type = el.tags?.amenity ?? el.tags?.tourism ?? el.tags?.natural ?? 'poi';

				return {
					name,
					type,
					lat,
					lng
				};
			});
	} catch (error) {
		console.error('Overpass query failed:', error);
		return [];
	}
}

/**
 * Find coffee shops near a point
 */
export async function findCoffeeShops(
	centerLat: number,
	centerLng: number,
	radiusKm: number = 5
): Promise<POI[]> {
	return queryPOIsForVibes(centerLat, centerLng, radiusKm, ['coffee_shop']);
}

/**
 * Find scenic viewpoints near a point
 */
export async function findViewpoints(
	centerLat: number,
	centerLng: number,
	radiusKm: number = 10
): Promise<POI[]> {
	return queryPOIsForVibes(centerLat, centerLng, radiusKm, ['scenic_views']);
}

/**
 * Find all relevant POIs for a set of vibes
 */
export async function findPOIsForVibes(
	centerLat: number,
	centerLng: number,
	distanceKm: number,
	vibes: Vibe[]
): Promise<POI[]> {
	// Search radius should be roughly half the ride distance
	const searchRadius = Math.max(distanceKm / 2, 5);
	return queryPOIsForVibes(centerLat, centerLng, searchRadius, vibes);
}
