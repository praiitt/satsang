import { config } from 'dotenv';
import * as path from 'path';
import { getDb, initFirebaseAdmin } from '../src/firebase.js';
import admin from 'firebase-admin';

// Load env vars from .env.local
config({ path: path.resolve(process.cwd(), '../.env.local') });

const MISSING_TRACKS = [
    // Healing Heart Chakra 528Hz
    {
        id: "f397a48a-9941-4f81-b3fb-eb3b483b383e",
        title: "Healing Heart Chakra 528Hz",
        audioUrl: "https://cdn1.suno.ai/f397a48a-9941-4f81-b3fb-eb3b483b383e.mp3",
        imageUrl: "https://cdn2.suno.ai/image_f397a48a-9941-4f81-b3fb-eb3b483b383e.jpeg",
        tags: "गहन, शांत और उपचारात्मक ध्यानात्मक संगीत 528Hz हृदय चक्र और ऊर्जा हीलिंग के लिए, सॉफ्ट एनालॉग सिंथ पैड्स, एम्बिएंट इलेक्ट्रॉनिक ड्रोन, हल्का डिजिटल पियानो, सॉफ्ट स्ट्रिंग्स और बहुत हल्के बाइनॉरल बीट्स के साथ, धीमी गति (40–60 BPM), ध्यानात्मक, दिव्य, शांत मूड",
        status: "COMPLETED",
        duration: 364.36,
        model_name: "chirp-auk-turbo"
    },
    {
        id: "4c17bfc0-9f9b-49ee-ab63-451209c31456",
        title: "Healing Heart Chakra 528Hz",
        audioUrl: "https://cdn1.suno.ai/4c17bfc0-9f9b-49ee-ab63-451209c31456.mp3",
        imageUrl: "https://cdn2.suno.ai/image_4c17bfc0-9f9b-49ee-ab63-451209c31456.jpeg",
        tags: "गहन, शांत और उपचारात्मक ध्यानात्मक संगीत 528Hz हृदय चक्र और ऊर्जा हीलिंग के लिए, सॉफ्ट एनालॉग सिंथ पैड्स, एम्बिएंट इलेक्ट्रॉनिक ड्रोन, हल्का डिजिटल पियानो, सॉफ्ट स्ट्रिंग्स और बहुत हल्के बाइनॉरल बीट्स के साथ, धीमी गति (40–60 BPM), ध्यानात्मक, दिव्य, शांत मूड",
        status: "COMPLETED",
        duration: 217.0,
        model_name: "chirp-auk-turbo"
    },
    // Awakening Energy
    {
        id: "862e8403-8f9f-419e-81b8-e6bd7f912b06",
        title: "Awakening Energy",
        audioUrl: "https://cdn1.suno.ai/862e8403-8f9f-419e-81b8-e6bd7f912b06.mp3",
        imageUrl: "https://cdn2.suno.ai/image_862e8403-8f9f-419e-81b8-e6bd7f912b06.jpeg",
        tags: "Meditation style with energetic and uplifting mood, featuring a mix of bansuri, sitar, tabla, piano, and crystal bowls",
        status: "COMPLETED",
        duration: 363.4,
        model_name: "chirp-auk-turbo"
    },
    {
        id: "7ba6e28f-2096-4814-9520-3d9002680d8e",
        title: "Awakening Energy",
        audioUrl: "https://cdn1.suno.ai/7ba6e28f-2096-4814-9520-3d9002680d8e.mp3",
        imageUrl: "https://cdn2.suno.ai/image_7ba6e28f-2096-4814-9520-3d9002680d8e.jpeg",
        tags: "Meditation style with energetic and uplifting mood, featuring a mix of bansuri, sitar, tabla, piano, and crystal bowls",
        status: "COMPLETED",
        duration: 457.24,
        model_name: "chirp-auk-turbo"
    }
];

async function restoreTracks() {
    try {
        console.log('Restoring missing tracks to Firestore...');
        initFirebaseAdmin();
        const db = getDb();

        for (const track of MISSING_TRACKS) {
            console.log(`Saving: ${track.title} (${track.id})`);

            const docRef = db.collection('music_tracks').doc(track.id);
            await docRef.set({
                userId: "default_user",
                sunoId: track.id,
                title: track.title,
                audioUrl: track.audioUrl,
                videoUrl: "", // No video available
                imageUrl: track.imageUrl,
                status: track.status,
                metadata: {
                    model_name: track.model_name,
                    tags: track.tags,
                    duration: track.duration
                },
                isPublic: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`✅ Saved ${track.id}`);
        }

    } catch (error) {
        console.error('Error restoring tracks:', error);
    }
}

restoreTracks();
