document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const exportBtn = document.getElementById('exportBtn');
    const keywordInput = document.getElementById('keyword');
    const locationInput = document.getElementById('location');
    const countryCodeInput = document.getElementById('countryCode');
    const radiusSelect = document.getElementById('radius');
    const gridSizeSelect = document.getElementById('gridSize');
    const coordsDisplay = document.getElementById('coordsDisplay');
    const loading = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    const noWebsiteBody = document.getElementById('noWebsiteBody');
    const noWebsiteCount = document.getElementById('noWebsiteCount');

    let noWebsiteResults = [];

    // Geocode a suburb name to lat/lng using OpenStreetMap Nominatim (free, no key)
    const geocode = async (place) => {
        const country = countryCodeInput.value.trim().toLowerCase() || 'au';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1&countrycodes=${country}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        console.log('Nominatim raw response:', data);
        if (!data.length) throw new Error(`Could not find location: "${place}"`);
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    };

    searchBtn.addEventListener('click', async () => {
        const keyword = keywordInput.value.trim();
        const locationRaw = locationInput.value.trim();
        const radius = radiusSelect.value;
        const gridSize = gridSizeSelect.value;

        if (!keyword || !locationRaw) {
            alert('Please enter a keyword and a suburb or location.');
            return;
        }

        // Resolve suburb to coordinates via Nominatim
        let lat, lng;
        loading.style.display = 'block';
        loading.textContent = `Finding "${locationRaw}"...`;
        try {
            const coords = await geocode(locationRaw);
            lat = coords.lat;
            lng = coords.lng;
            coordsDisplay.textContent = `📍 Resolved to: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            coordsDisplay.style.display = 'block';
        } catch (e) {
            loading.style.display = 'none';
            alert(e.message);
            return;
        }

        loading.textContent = 'Running grid search... this may take 30–60 seconds.';
        loading.style.display = 'block';
        resultsSection.style.display = 'none';
        noWebsiteBody.innerHTML = '';
        noWebsiteResults = [];

        try {
            const params = new URLSearchParams({ keyword, lat, lng, radius, gridSize });
            const response = await fetch(`/api/places/search?${params}`);
            const data = await response.json();

            if (!response.ok) {
                alert(data.error || data.message || 'No results found.');
                return;
            }

            const { stats, allBusinesses, noWebsite } = data;

            // Update stats bar
            document.getElementById('statRaw').textContent = stats.raw;
            document.getElementById('statUnique').textContent = stats.unique;
            document.getElementById('statDupes').textContent = stats.dupesRemoved;
            document.getElementById('statLeads').textContent = stats.leads;

            // Populate "No Website" leads table
            noWebsiteResults = noWebsite;
            noWebsiteCount.textContent = noWebsite.length;
            noWebsite.forEach(b => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${b.name}</td>
                    <td>${b.address}</td>
                    <td>${b.id}</td>
                `;
                noWebsiteBody.appendChild(row);
            });

            resultsSection.style.display = 'block';
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('An error occurred while fetching data. Please try again.');
        } finally {
            loading.style.display = 'none';
        }
    });

    exportBtn.addEventListener('click', () => {
        if (!noWebsiteResults.length) return;

        const headers = ['Business Name', 'Address', 'Place ID'];
        const rows = noWebsiteResults.map(b => [b.name, b.address, b.id]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'leads-no-website.csv';
        link.click();
        URL.revokeObjectURL(url);
    });
});