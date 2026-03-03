const axios = require('axios');
require('dotenv').config();

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.websiteUri,nextPageToken';

/**
 * Calls the Places Text Search API.
 *
 * @param {string} textQuery       - The search keyword (e.g. "plumbers")
 * @param {string|null} pageToken  - Optional nextPageToken for pagination
 * @param {object|null} locationBias - Optional { lat, lng, radiusMeters } for grid search
 * @returns {{ places: Array, nextPageToken: string|null }}
 */
const searchPlaces = async (textQuery, pageToken = null, locationBias = null) => {
    const body = { textQuery, pageSize: 20 };

    if (pageToken) body.pageToken = pageToken;

    if (locationBias) {
        body.locationBias = {
            circle: {
                center: {
                    latitude: locationBias.lat,
                    longitude: locationBias.lng
                },
                radius: locationBias.radiusMeters
            }
        };
    }

    const response = await axios.post(
        PLACES_SEARCH_URL,
        body,
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': FIELD_MASK
            }
        }
    );

    return {
        places: response.data.places || [],
        nextPageToken: response.data.nextPageToken || null
    };
};

module.exports = { searchPlaces };