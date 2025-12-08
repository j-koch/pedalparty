import { nanoid } from 'nanoid';

/**
 * Generate a short, URL-safe ride ID
 */
export function generateRideId(): string {
	return nanoid(8); // 8 characters, e.g., "abc12def"
}

/**
 * Generate a secure organizer token
 */
export function generateOrganizerToken(): string {
	return nanoid(24); // Longer for security
}

/**
 * Generate a visitor token for tracking preference updates
 */
export function generateVisitorToken(): string {
	return nanoid(16);
}

/**
 * Generate a 6-digit numeric PIN for organizer recovery
 */
export function generatePin(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate the geographic centroid of multiple points
 */
export function calculateCentroid(
	points: { lat: number; lng: number }[]
): { lat: number; lng: number } {
	if (points.length === 0) {
		throw new Error('Cannot calculate centroid of empty array');
	}

	if (points.length === 1) {
		return { ...points[0] };
	}

	// Convert to radians and use spherical averaging
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const toDeg = (rad: number) => (rad * 180) / Math.PI;

	let x = 0;
	let y = 0;
	let z = 0;

	for (const point of points) {
		const latRad = toRad(point.lat);
		const lngRad = toRad(point.lng);

		x += Math.cos(latRad) * Math.cos(lngRad);
		y += Math.cos(latRad) * Math.sin(lngRad);
		z += Math.sin(latRad);
	}

	x /= points.length;
	y /= points.length;
	z /= points.length;

	const centralLng = Math.atan2(y, x);
	const centralSquareRoot = Math.sqrt(x * x + y * y);
	const centralLat = Math.atan2(z, centralSquareRoot);

	return {
		lat: toDeg(centralLat),
		lng: toDeg(centralLng)
	};
}

/**
 * Calculate distance between two points in kilometers (Haversine formula)
 */
export function distanceKm(
	point1: { lat: number; lng: number },
	point2: { lat: number; lng: number }
): number {
	const R = 6371; // Earth's radius in km
	const toRad = (deg: number) => (deg * Math.PI) / 180;

	const dLat = toRad(point2.lat - point1.lat);
	const dLng = toRad(point2.lng - point1.lng);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(point1.lat)) *
			Math.cos(toRad(point2.lat)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

/**
 * Calculate the median of an array of numbers
 */
export function median(numbers: number[]): number {
	if (numbers.length === 0) {
		throw new Error('Cannot calculate median of empty array');
	}

	const sorted = [...numbers].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 0) {
		return (sorted[mid - 1] + sorted[mid]) / 2;
	}

	return sorted[mid];
}

/**
 * Count occurrences in an array
 */
export function countOccurrences<T>(items: T[]): Map<T, number> {
	const counts = new Map<T, number>();

	for (const item of items) {
		counts.set(item, (counts.get(item) ?? 0) + 1);
	}

	return counts;
}

/**
 * Get majority vote result from an array
 */
export function majorityVote<T>(items: T[], defaultValue: T): T {
	if (items.length === 0) {
		return defaultValue;
	}

	const counts = countOccurrences(items);
	let maxCount = 0;
	let result = defaultValue;

	for (const [item, count] of counts) {
		if (count > maxCount) {
			maxCount = count;
			result = item;
		}
	}

	return result;
}
