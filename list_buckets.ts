import { getAdminStorage } from './lib/firebase-admin';

async function listBuckets() {
    try {
        const storage = getAdminStorage();
        const [buckets] = await storage.getBuckets();
        console.log('Available buckets:');
        buckets.forEach(b => console.log(b.name));
    } catch (e) {
        console.error('Error listing buckets:', e);
    }
}

listBuckets();
