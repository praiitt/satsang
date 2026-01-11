import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        await initAdmin();
        const db = getFirestore();
        const storage = getStorage().bucket();

        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const tags = formData.get('tags') as string;
        const audioFile = formData.get('audioFile') as File;
        const imageFile = formData.get('imageFile') as File | null;

        if (!audioFile || !title) {
            return NextResponse.json(
                { error: 'Title and audio file are required' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const audioFileName = `music/${timestamp}_${audioFile.name}`;
        const imageFileName = imageFile ? `music/covers/${timestamp}_${imageFile.name}` : null;

        // Upload audio file to Cloud Storage
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const audioFileRef = storage.file(audioFileName);
        await audioFileRef.save(audioBuffer, {
            contentType: audioFile.type,
            metadata: {
                contentType: audioFile.type,
            }
        });
        await audioFileRef.makePublic();
        const audioUrl = `https://storage.googleapis.com/${storage.name}/${audioFileName}`;

        // Upload image file if provided
        let imageUrl = null;
        if (imageFile && imageFileName) {
            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
            const imageFileRef = storage.file(imageFileName);
            await imageFileRef.save(imageBuffer, {
                contentType: imageFile.type,
                metadata: {
                    contentType: imageFile.type,
                }
            });
            await imageFileRef.makePublic();
            imageUrl = `https://storage.googleapis.com/${storage.name}/${imageFileName}`;
        }

        // Create track document in Firestore
        const trackRef = await db.collection('music_tracks').add({
            title,
            description: description || '',
            audioUrl,
            imageUrl,
            metadata: {
                tags: tags || '',
            },
            userId: 'admin-upload',
            status: 'COMPLETED',
            category: 'rraasi-music',
            isPublic: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            trackId: trackRef.id,
            audioUrl,
            imageUrl
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
