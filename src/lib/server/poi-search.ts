// POI Search using Photon API (free, OSM-based geocoder)

const PHOTON_URL = 'https://photon.komoot.io/api/';

export interface POISearchResult {
	id: string;
	name: string;
	address: string;
	lat: number;
	lng: number;
	type: string;
	distance_km?: number;
}

interface PhotonFeature {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number]; // [lng, lat]
	};
	properties: {
		osm_id?: number;
		osm_type?: string;
		name?: string;
		street?: string;
		housenumber?: string;
		city?: string;
		state?: string;
		country?: string;
		type?: string;
	};
}

interface PhotonResponse {
	type: 'FeatureCollection';
	features: PhotonFeature[];
}

/**
 * Search for POIs using the Photon geocoder
 * Results are biased toward the provided lat/lng location
 */
export async function searchPOIs(
	query: string,
	lat: number,
	lng: number,
	limit: number = 5
): Promise<POISearchResult[]> {
	if (!query.trim()) {
		return [];
	}

	const url = new URL(PHOTON_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('lat', String(lat));
	url.searchParams.set('lon', String(lng));
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('lang', 'en');

	try {
		const response = await fetch(url.toString());

		if (!response.ok) {
			console.error('Photon API error:', response.status);
			return [];
		}

		const data: PhotonResponse = await response.json();

		return data.features.map((feature) => {
			const [featureLng, featureLat] = feature.geometry.coordinates;
			const props = feature.properties;

			// Build address string
			const addressParts: string[] = [];
			if (props.street) {
				addressParts.push(props.housenumber ? `${props.housenumber} ${props.street}` : props.street);
			}
			if (props.city) {
				addressParts.push(props.city);
			}
			if (props.state && props.state !== props.city) {
				addressParts.push(props.state);
			}

			// Calculate distance from search location
			const distance_km = calculateDistance(lat, lng, featureLat, featureLng);

			return {
				id: `${props.osm_type || 'node'}_${props.osm_id || Math.random().toString(36).slice(2)}`,
				name: props.name || addressParts[0] || 'Unknown',
				address: addressParts.join(', ') || props.country || '',
				lat: featureLat,
				lng: featureLng,
				type: props.type || 'place',
				distance_km
			};
		});
	} catch (err) {
		console.error('POI search error:', err);
		return [];
	}
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371; // Earth's radius in km
	const toRad = (deg: number) => (deg * Math.PI) / 180;

	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}
