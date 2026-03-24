import { getDb } from '../src/firebase.js';

const db = getDb();

async function makeRecordingsPublic(userId: string) {
    console.log(`Setting recordings to public for user: ${userId}\n`);

    try {
        const snapshot = await db.collection('recordings')
            .where('userId', '==', userId)
            .get();

        if (snapshot.empty) {
            console.log('No recordings found.');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const filePath = data.filePath;
            const updates: any = { 
                isPublic: true,
                status: 'completed'
            };

            if (filePath && !data.publicUrl) {
                updates.publicUrl = `https://storage.googleapis.com/rraasi-agent-recordings/${filePath}`;
            }

            batch.update(doc.ref, updates);
        });

        await batch.commit();
        console.log(`Successfully marked ${snapshot.size} recordings as public.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

const userId = process.argv[2] || 'EoZTHzlHadWZxyZkxegKwxZlamY2';
makeRecordingsPublic(userId);
