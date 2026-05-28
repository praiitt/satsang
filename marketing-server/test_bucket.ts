import * as dotenv from 'dotenv';
dotenv.config();
import { initFirebaseAdmin, getStorage } from './src/firebase.js';

initFirebaseAdmin();
async function test() {
    try {
        const bucket = getStorage().bucket('rraasi-8a619.appspot.com');
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log("Success appspot:", files.map(f => f.name));
    } catch (e) {
        console.error("Error appspot:", e.message);
    }
    
    try {
        const bucket2 = getStorage().bucket('rraasi-8a619.firebasestorage.app');
        const [files2] = await bucket2.getFiles({ maxResults: 1 });
        console.log("Success firebasestorage:", files2.map(f => f.name));
    } catch (e) {
        console.error("Error firebasestorage:", e.message);
    }
}
test();
