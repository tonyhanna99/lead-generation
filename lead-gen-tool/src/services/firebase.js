const admin = require('firebase-admin');

let db = null;

const initFirebase = () => {
    if (admin.apps.length > 0) return admin.apps[0];

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Missing Firebase credentials.\n' +
            '  1. Go to: Firebase Console → Project Settings → Service Accounts\n' +
            '  2. Click "Generate new private key" and download the JSON file\n' +
            '  3. Copy client_email → FIREBASE_CLIENT_EMAIL in .env\n' +
            '  4. Copy private_key  → FIREBASE_PRIVATE_KEY  in .env'
        );
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });

    return admin.apps[0];
};

const getFirestore = () => {
    if (!db) {
        initFirebase();
        db = admin.firestore();
    }
    return db;
};

module.exports = { getFirestore, admin };
