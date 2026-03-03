/**
 * Filters a Map of businesses to only those without a websiteUri.
 *
 * @param {Map<string, object>} businessMap - Deduplicated map keyed by place.id
 * @returns {Array} Filtered array of businesses without a website
 */
const filterNoWebsite = (businessMap) => {
    return Array.from(businessMap.values()).filter(b => !b.website);
};

module.exports = { filterNoWebsite };
