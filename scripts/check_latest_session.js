
const admin = require('firebase-admin');
const serviceAccount = require('../rraasiServiceAccount.json');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkLatestSession() {
    console.log('🔍 Querying latest meditation_sessions (ordered by completedAt)...');

    try {
        const snapshot = await db.collection('meditation_sessions')
            .orderBy('completedAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log('❌ No sessions found in meditation_sessions.');

            // Fallback check: just get ANY document to see if collection exists/schema
            const anyDoc = await db.collection('meditation_sessions').limit(1).get();
            if (!anyDoc.empty) {
                console.log('⚠️ Collection exists but maybe order by completedAt failed? Sample doc:', anyDoc.docs[0].data());
            }
            return;
        }

        console.log(`✅ Found ${snapshot.size} recent sessions.`);

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const history = data.chatHistory || [];
            // Handle timestamp: it might be a Firestore Timestamp object or null
            let dateStr = 'Unknown';
            if (data.completedAt && data.completedAt.toDate) {
                dateStr = data.completedAt.toDate().toLocaleString();
            } else if (data.completedAt) {
                dateStr = new Date(data.completedAt).toLocaleString();
            }

            console.log(`\n--- Session #${index + 1} [ID: ${doc.id}] ---`);
            console.log(`UserID: ${data.userId}`);
            console.log(`CompletedAt: ${dateStr}`);
            console.log(`Chat History Length: ${history.length} messages`);

            if (history.length > 0) {
                console.log('Last 3 messages:');
                history.slice(-3).forEach(msg => {
                    console.log(`  [${msg.role}]: ${msg.content ? msg.content.substring(0, 100) : '[No Content]'}`);
                });
            } else {
                console.log('  (Empty Chat History)');
            }
        });

    } catch (error) {
        console.error('❌ Error querying sessions:', error);
    }
}

checkLatestSession();
