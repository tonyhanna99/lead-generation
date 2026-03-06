const express = require('express');
const router = express.Router();
const { getFirestore, admin } = require('../services/firebase');

const COLLECTION = 'searches';

// Build a deterministic document ID from search params
const makeDocId = (keyword, location, radius, gridSize) =>
    [keyword, location, radius, gridSize]
        .map(v => String(v).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
        .join('__');

// GET /api/searches/check?keyword=&location=&radius=&gridSize=
router.get('/check', async (req, res) => {
    const { keyword, location, radius, gridSize } = req.query;
    if (!keyword || !location) return res.json({ exists: false });
    try {
        const db = getFirestore();
        const docId = makeDocId(keyword, location, radius, gridSize);
        const snap = await db.collection(COLLECTION).doc(docId).get();
        if (!snap.exists) return res.json({ exists: false });
        const data = snap.data();
        return res.json({
            exists: true,
            searchedAt: data.searchedAt?.toDate()?.toISOString() || null,
            leadsFound: data.leadsFound || 0
        });
    } catch (e) {
        // If Firebase not configured, silently allow the search to proceed
        console.warn('[searches] check failed (Firebase not ready?):', e.message);
        return res.json({ exists: false });
    }
});

// GET /api/searches — list all searches, most recent first
router.get('/', async (req, res) => {
    try {
        const db = getFirestore();
        const snap = await db.collection(COLLECTION).orderBy('searchedAt', 'desc').get();
        const searches = snap.docs.map(doc => {
            const d = doc.data();
            return {
                keyword: d.keyword,
                location: d.location,
                radius: d.radius,
                gridSize: d.gridSize,
                leadsFound: d.leadsFound || 0,
                searchedAt: d.searchedAt?.toDate()?.toISOString() || null
            };
        });
        return res.json(searches);
    } catch (e) {
        console.warn('[searches] list failed:', e.message);
        return res.json([]);
    }
});

// POST /api/searches — record a completed search
router.post('/', async (req, res) => {
    const { keyword, location, radius, gridSize, leadsFound } = req.body;
    if (!keyword || !location) return res.status(400).json({ error: 'keyword and location required' });
    try {
        const db = getFirestore();
        const docId = makeDocId(keyword, location, radius, gridSize);
        await db.collection(COLLECTION).doc(docId).set({
            keyword,
            location,
            radius: String(radius),
            gridSize: String(gridSize),
            leadsFound: leadsFound || 0,
            searchedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.json({ success: true });
    } catch (e) {
        console.warn('[searches] record failed:', e.message);
        return res.json({ success: false });
    }
});

module.exports = router;
