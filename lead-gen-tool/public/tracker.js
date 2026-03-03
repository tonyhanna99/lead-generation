document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.API_BASE || '';
    const statusFilter = document.getElementById('statusFilter');
    const searchFilter = document.getElementById('searchFilter');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const trackerBody = document.getElementById('trackerBody');
    const trackerLoading = document.getElementById('trackerLoading');
    const trackerError = document.getElementById('trackerError');
    const leadCount = document.getElementById('leadCount');

    const STATUS_LABELS = {
        new: 'New',
        contacted_interested: 'Interested',
        contacted_not_interested: 'Not Interested',
        discarded: 'Discarded'
    };

    const STATUS_BADGE_CLASS = {
        new: 'badge-new',
        contacted_interested: 'badge-interested',
        contacted_not_interested: 'badge-not-interested',
        discarded: 'badge-discarded'
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Patch a lead's status and/or notes
    const patchLead = async (placeId, updates) => {
        try {
            const res = await fetch(`${API_BASE}/api/leads/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update');
        } catch (e) {
            alert(`Error updating lead: ${e.message}`);
        }
    };

    // Render a single row
    const renderRow = (lead) => {
        const tr = document.createElement('tr');
        tr.dataset.placeId = lead.placeId;

        const badgeClass = STATUS_BADGE_CLASS[lead.status] || 'badge-new';
        const badgeLabel = STATUS_LABELS[lead.status] || lead.status;

        tr.innerHTML = `
            <td class="cell-name"><strong>${escapeHtml(lead.name)}</strong></td>
            <td>
                <span class="badge ${badgeClass} status-badge">${badgeLabel}</span>
            </td>
            <td class="cell-actions">
                <button class="action-btn btn-new" title="Reset to New" data-status="new">🔄</button>
                <button class="action-btn btn-interested" title="Mark Interested" data-status="contacted_interested">✅</button>
                <button class="action-btn btn-not-interested" title="Mark Not Interested" data-status="contacted_not_interested">🚫</button>
                <button class="action-btn btn-discard" title="Discard" data-status="discarded">🗑️</button>
            </td>
            <td>
                <input type="text" class="notes-input" value="${escapeHtml(lead.notes || '')}" placeholder="Add notes…" />
            </td>
            <td class="cell-address">${escapeHtml(lead.formattedAddress || '—')}</td>
            <td>${escapeHtml(lead.keyword || '—')}</td>
            <td>${escapeHtml(lead.searchLocation || '—')}</td>
            <td class="cell-date">${formatDate(lead.createdAt)}</td>
        `;

        // Action buttons
        tr.querySelectorAll('.action-btn[data-status]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const newStatus = btn.dataset.status;
                await patchLead(lead.placeId, { status: newStatus });
                // Update badge in-place
                const badge = tr.querySelector('.status-badge');
                badge.className = `badge ${STATUS_BADGE_CLASS[newStatus]} status-badge`;
                badge.textContent = STATUS_LABELS[newStatus];
            });
        });

        // Notes — save on blur
        const notesInput = tr.querySelector('.notes-input');
        notesInput.addEventListener('blur', async () => {
            await patchLead(lead.placeId, { notes: notesInput.value.trim() });
        });
        notesInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') notesInput.blur();
        });

        return tr;
    };

    // Fetch and render leads
    const loadLeads = async () => {
        trackerLoading.style.display = 'block';
        trackerError.style.display = 'none';
        trackerBody.innerHTML = '';

        const params = new URLSearchParams();
        const statusVal = statusFilter.value;
        const searchVal = searchFilter.value.trim();
        if (statusVal !== 'all') params.set('status', statusVal);
        if (searchVal) params.set('search', searchVal);

        try {
            const res = await fetch(`${API_BASE}/api/leads?${params}`);            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to load leads');
            }
            const { leads } = await res.json();

            leadCount.textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''}`;

            if (!leads.length) {
                trackerBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:24px;">No leads match your filters.</td></tr>';
                return;
            }

            leads.forEach(lead => trackerBody.appendChild(renderRow(lead)));
        } catch (e) {
            trackerError.textContent = e.message;
            trackerError.style.display = 'block';
        } finally {
            trackerLoading.style.display = 'none';
        }
    };

    // Escape HTML to prevent XSS
    const escapeHtml = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    applyFiltersBtn.addEventListener('click', loadLeads);
    statusFilter.addEventListener('change', loadLeads);
    searchFilter.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadLeads(); });

    // Initial load
    loadLeads();
});
