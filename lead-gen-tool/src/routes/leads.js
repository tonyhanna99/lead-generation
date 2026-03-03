const express = require('express');
const router = express.Router();
const { getFirestore, admin } = require('../services/firebase');

const COLLECTION = 'leads';

// Chunk array into groups of n (Firestore batch limit is 500)
const chunk = (arr, n) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
    return chunks;
};

// Serialize Firestore timestamps to ISO strings for JSON response
const serializeLead = (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString() || null,
    contactedAt: data.contactedAt?.toDate?.()?.toISOString() || null
});

// GET /api/leads — fetch all leads, filter in memory
router.get('/', async (req, res) => {
    const { status, search } = req.query;
    try {
        const db = getFirestore();
        const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
        let leads = snapshot.docs.map(doc => serializeLead({ placeId: doc.id, ...doc.data() }));

        if (status && status !== 'all') {
            leads = leads.filter(l => l.status === status);
        }
        if (search) {
            const q = search.toLowerCase();
            leads = leads.filter(l =>
                l.name?.toLowerCase().includes(q) ||
                l.formattedAddress?.toLowerCase().includes(q) ||
                l.keyword?.toLowerCase().includes(q)
            );
        }

        return res.json({ leads });
    } catch (err) {
        console.error('GET /api/leads error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/leads/upsert — batch upsert leads from a search
router.post('/upsert', async (req, res) => {
    const { leads, keyword, searchLocation } = req.body;

    if (!Array.isArray(leads) || !leads.length) {
        return res.status(400).json({ error: 'leads array is required' });
    }

    try {
        const db = getFirestore();
        const now = admin.firestore.FieldValue.serverTimestamp();
        let inserted = 0;
        let updated = 0;

        // Process in chunks of 500 to respect Firestore batch limits
        for (const leadChunk of chunk(leads, 500)) {
            const refs = leadChunk.map(l => db.collection(COLLECTION).doc(l.id));
            const snapshots = await db.getAll(...refs);
            const batch = db.batch();

            snapshots.forEach((snap, i) => {
                const lead = leadChunk[i];
                const ref = refs[i];

                if (snap.exists) {
                    // Only update discovery metadata — never overwrite status/notes
                    const updateData = { lastSeenAt: now };
                    const existing = snap.data();
                    if (!existing.keyword) updateData.keyword = keyword || '';
                    if (!existing.searchLocation) updateData.searchLocation = searchLocation || '';
                    batch.update(ref, updateData);
                    updated++;
                } else {
                    batch.set(ref, {
                        placeId: lead.id,
                        name: lead.name || '',
                        formattedAddress: lead.address || '',
                        websiteUri: lead.website || null,
                        keyword: keyword || '',
                        searchLocation: searchLocation || '',
                        createdAt: now,
                        lastSeenAt: now,
                        status: 'new',
                        notes: '',
                        contactedAt: null
                    });
                    inserted++;
                }
            });

            await batch.commit();
        }

        console.log(`[Firestore] Upserted ${leads.length} leads: ${inserted} new, ${updated} updated`);
        return res.json({ inserted, updated });
    } catch (err) {
        console.error('POST /api/leads/upsert error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// PATCH /api/leads/:placeId — update status and/or notes
router.patch('/:placeId', async (req, res) => {
    const { placeId } = req.params;
    const { status, notes } = req.body;

    try {
        const db = getFirestore();
        const now = admin.firestore.FieldValue.serverTimestamp();
        const updateData = { lastSeenAt: now };

        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        // Set contactedAt timestamp when marking as contacted
        if (status === 'contacted_interested' || status === 'contacted_not_interested') {
            updateData.contactedAt = now;
        }

        await db.collection(COLLECTION).doc(placeId).update(updateData);
        return res.json({ success: true });
    } catch (err) {
        console.error(`PATCH /api/leads/${placeId} error:`, err.message);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
