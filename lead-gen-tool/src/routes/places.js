const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../services/googlePlaces');
const { generateGrid } = require('../utils/grid');
const { filterNoWebsite } = require('../utils/filter');
const delay = require('../utils/delay');

router.get('/search', async (req, res) => {
    const {
        keyword,
        lat,
        lng,
        radius = 5000,
        gridSize = 9
    } = req.query;

    if (!keyword || !lat || !lng) {
        return res.status(400).json({ error: 'keyword, lat, and lng are required' });
    }

    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const radiusMeters = parseInt(radius);
    const gridPoints = generateGrid(centerLat, centerLng, radiusMeters, parseInt(gridSize));

    // Master deduplication map keyed by place.id
    const seen = new Map();
    let rawTotal = 0;

    console.log(`\n━━━ Grid Search: "${keyword}" | ${gridPoints.length} points | radius ${radiusMeters}m ━━━`);

    try {
        for (let i = 0; i < gridPoints.length; i++) {
            const point = gridPoints[i];
            const locationBias = { lat: point.lat, lng: point.lng, radiusMeters: point.pointRadius };

            console.log(`\n[Point ${i + 1}/${gridPoints.length}] lat=${point.lat.toFixed(4)}, lng=${point.lng.toFixed(4)}, r=${point.pointRadius}m`);

            // --- Page 1 ---
            const page1 = await searchPlaces(keyword, null, locationBias);
            rawTotal += page1.places.length;
            console.log(`  Page 1: ${page1.places.length} results`);

            page1.places.forEach(p => {
                if (!seen.has(p.id)) {
                    seen.set(p.id, {
                        id: p.id,
                        name: p.displayName?.text || '—',
                        address: p.formattedAddress || '—',
                        website: p.websiteUri || null
                    });
                }
            });

            // --- Page 2 (if available) ---
            if (page1.nextPageToken) {
                console.log(`  nextPageToken found — waiting 3s...`);
                await delay(3000);

                const page2 = await searchPlaces(keyword, page1.nextPageToken, locationBias);
                rawTotal += page2.places.length;
                console.log(`  Page 2: ${page2.places.length} results`);

                page2.places.forEach(p => {
                    if (!seen.has(p.id)) {
                        seen.set(p.id, {
                            id: p.id,
                            name: p.displayName?.text || '—',
                            address: p.formattedAddress || '—',
                            website: p.websiteUri || null
                        });
                    }
                });
            } else {
                console.log(`  No nextPageToken — only 1 page available.`);
            }

            // Small pause between grid points to respect rate limits
            if (i < gridPoints.length - 1) {
                await delay(500);
            }
        }

        if (seen.size === 0) {
            return res.status(404).json({ message: 'No results found.' });
        }

        const allBusinesses = Array.from(seen.values());
        const noWebsite = filterNoWebsite(seen);

        console.log(`\n━━━ Done ━━━`);
        console.log(`  Raw results (with dupes): ${rawTotal}`);
        console.log(`  Unique businesses:        ${allBusinesses.length}`);
        console.log(`  No website (leads):       ${noWebsite.length}`);
        console.log(`  Dupes removed:            ${rawTotal - allBusinesses.length}\n`);

        return res.json({
            stats: {
                raw: rawTotal,
                unique: allBusinesses.length,
                leads: noWebsite.length,
                dupesRemoved: rawTotal - allBusinesses.length
            },
            allBusinesses,
            noWebsite
        });

    } catch (error) {
        console.error('Error in /search route:', error.response?.data || error.message);
        return res.status(500).json({ error: 'An error occurred while fetching places' });
    }
});

module.exports = router;