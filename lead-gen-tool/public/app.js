document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.API_BASE || '';
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
    const spinnerOverlay = document.getElementById('spinnerOverlay');
    const spinnerMsg = document.getElementById('spinnerMsg');
    const dupModalOverlay = document.getElementById('dupModalOverlay');
    const dupModalMsg = document.getElementById('dupModalMsg');
    const dupProceedBtn = document.getElementById('dupProceedBtn');
    const dupCancelBtn = document.getElementById('dupCancelBtn');

    let noWebsiteResults = [];

    // ── Spinner helpers ──────────────────────────────────────────────────────
    const showSpinner = (msg = 'Running grid search…') => {
        spinnerMsg.textContent = msg;
        spinnerOverlay.style.display = 'flex';
    };
    const hideSpinner = () => { spinnerOverlay.style.display = 'none'; };

    // ── Duplicate-check modal (returns a Promise<bool>) ───────────────────────
    const confirmDuplicate = (msg) => new Promise(resolve => {
        dupModalMsg.textContent = msg;
        dupModalOverlay.style.display = 'flex';
        const cleanup = (result) => {
            dupModalOverlay.style.display = 'none';
            dupProceedBtn.removeEventListener('click', onProceed);
            dupCancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        };
        const onProceed = () => cleanup(true);
        const onCancel  = () => cleanup(false);
        dupProceedBtn.addEventListener('click', onProceed);
        dupCancelBtn.addEventListener('click', onCancel);
    });

    // ── Geocode ───────────────────────────────────────────────────────────────
    const geocode = async (place) => {
        const country = countryCodeInput.value.trim().toLowerCase() || 'au';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1&countrycodes=${country}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        if (!data.length) throw new Error(`Could not find location: "${place}"`);
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    };

    // ── Run the actual search (after any duplicate confirmation) ─────────────
    const runSearch = async (keyword, locationRaw, radius, gridSize) => {
        // Geocode
        showSpinner(`Finding "${locationRaw}"…`);
        let lat, lng;
        try {
            const coords = await geocode(locationRaw);
            lat = coords.lat;
            lng = coords.lng;
            coordsDisplay.textContent = `📍 Resolved to: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            coordsDisplay.style.display = 'block';
        } catch (e) {
            hideSpinner();
            alert(e.message);
            return;
        }

        showSpinner('Running grid search… this may take 30–60 seconds.');
        resultsSection.style.display = 'none';
        noWebsiteBody.innerHTML = '';
        noWebsiteResults = [];

        try {
            const params = new URLSearchParams({ keyword, lat, lng, radius, gridSize });
            const response = await fetch(`${API_BASE}/api/places/search?${params}`);
            const data = await response.json();

            if (!response.ok) {
                alert(data.error || data.message || 'No results found.');
                return;
            }

            const { stats, noWebsite } = data;

            document.getElementById('statRaw').textContent = stats.raw;
            document.getElementById('statUnique').textContent = stats.unique;
            document.getElementById('statDupes').textContent = stats.dupesRemoved;
            document.getElementById('statLeads').textContent = stats.leads;

            noWebsiteResults = noWebsite;
            noWebsiteCount.textContent = noWebsite.length;
            noWebsite.forEach(b => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${b.name}</td><td>${b.address}</td><td>${b.id}</td>`;
                noWebsiteBody.appendChild(row);
            });

            resultsSection.style.display = 'block';

            // Record this search so we can warn next time
            fetch(`${API_BASE}/api/searches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, location: locationRaw, radius, gridSize, leadsFound: noWebsite.length })
            }).catch(() => {});

            // Upsert leads to Firestore tracker
            if (noWebsite.length) {
                try {
                    const upsertRes = await fetch(`${API_BASE}/api/leads/upsert`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leads: noWebsite, keyword, searchLocation: locationRaw })
                    });
                    const upsertData = await upsertRes.json();
                    const saveStatus = document.getElementById('saveStatus');
                    if (upsertRes.ok) {
                        saveStatus.textContent = `✅ Saved to tracker: ${upsertData.inserted} new, ${upsertData.updated} updated`;
                        saveStatus.className = 'save-status save-status-ok';
                    } else {
                        saveStatus.textContent = `⚠️ Could not save to tracker: ${upsertData.error}`;
                        saveStatus.className = 'save-status save-status-warn';
                    }
                    saveStatus.style.display = 'block';
                } catch (e) {
                    const saveStatus = document.getElementById('saveStatus');
                    saveStatus.textContent = `⚠️ Tracker not configured — leads not saved. Set Firebase env vars to enable.`;
                    saveStatus.className = 'save-status save-status-warn';
                    saveStatus.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('An error occurred while fetching data. Please try again.');
        } finally {
            hideSpinner();
        }
    };

    // ── Search button ─────────────────────────────────────────────────────────
    searchBtn.addEventListener('click', async () => {
        const keyword = keywordInput.value.trim();
        const locationRaw = locationInput.value.trim();
        const radius = radiusSelect.value;
        const gridSize = gridSizeSelect.value;

        if (!keyword || !locationRaw) {
            alert('Please enter a keyword and a suburb or location.');
            return;
        }

        // Show spinner immediately so there's no blank delay during cold-start
        showSpinner('Connecting…');
        searchBtn.disabled = true;

        // Check if this exact search has been run before
        try {
            const chkRes = await fetch(`${API_BASE}/api/searches/check?${new URLSearchParams({ keyword, location: locationRaw, radius, gridSize })}`);
            const chk = await chkRes.json();
            if (chk.exists) {
                hideSpinner();
                const when = chk.searchedAt
                    ? new Date(chk.searchedAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'previously';
                const msg = `You already searched for "${keyword}" in "${locationRaw}" (radius ${radius}m, grid ${gridSize}) on ${when} — it returned ${chk.leadsFound} lead(s). Run it again?`;
                const proceed = await confirmDuplicate(msg);
                if (!proceed) {
                    searchBtn.disabled = false;
                    return;
                }
            }
        } catch (e) {
            // If check fails for any reason, just proceed silently
        }

        await runSearch(keyword, locationRaw, radius, gridSize);
        searchBtn.disabled = false;
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