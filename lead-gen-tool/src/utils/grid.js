/**
 * Generates a grid of lat/lng search points around a center coordinate.
 *
 * @param {number} centerLat   - Center latitude
 * @param {number} centerLng   - Center longitude
 * @param {number} radiusMeters - Total search radius around center (meters)
 * @param {number} gridSize    - Total grid points (perfect square: 1, 4, 9, 16)
 * @returns {Array<{ lat: number, lng: number, pointRadius: number }>}
 */
const generateGrid = (centerLat, centerLng, radiusMeters, gridSize) => {
    const dim = Math.round(Math.sqrt(gridSize)); // e.g. 9 -> 3x3

    // Degrees per meter (approximate)
    const latDegPerMeter = 1 / 111000;
    const lngDegPerMeter = 1 / (111000 * Math.cos((centerLat * Math.PI) / 180));

    // If single point, just return the center
    if (dim === 1) {
        return [{ lat: centerLat, lng: centerLng, pointRadius: radiusMeters }];
    }

    // Spacing between grid points distributed evenly across the bounding box
    const latSpacing = (2 * radiusMeters * latDegPerMeter) / (dim - 1);
    const lngSpacing = (2 * radiusMeters * lngDegPerMeter) / (dim - 1);

    // Each point's individual search radius (slightly overlapping to avoid gaps)
    const pointRadius = Math.round((radiusMeters / dim) * 1.8);

    const points = [];

    for (let row = 0; row < dim; row++) {
        for (let col = 0; col < dim; col++) {
            const lat = (centerLat - radiusMeters * latDegPerMeter) + row * latSpacing;
            const lng = (centerLng - radiusMeters * lngDegPerMeter) + col * lngSpacing;
            points.push({ lat, lng, pointRadius });
        }
    }

    return points;
};

module.exports = { generateGrid };
