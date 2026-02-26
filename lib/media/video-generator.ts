
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

export interface VideoGenerationOptions {
    audioUrl: string;
    imageUrl: string;
    outputName: string;
}

export async function generateVideoFromAudio({ audioUrl, imageUrl, outputName }: VideoGenerationOptions): Promise<string> {
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `${outputName}_audio.mp3`);
    const imagePath = path.join(tempDir, `${outputName}_image.jpg`);
    const videoPath = path.join(tempDir, `${outputName}.mp4`);

    try {
        // Download Audio
        const audioRes = await fetch(audioUrl);
        if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.statusText}`);
        await streamPipeline(audioRes.body as any, fs.createWriteStream(audioPath));

        // Download Image
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error(`Failed to download image: ${imageRes.statusText}`);
        await streamPipeline(imageRes.body as any, fs.createWriteStream(imagePath));

        // Generate Video
        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(imagePath)
                .loop() // Loop the image
                .input(audioPath)
                .outputOptions([
                    '-c:v libx264', // Video codec
                    '-tune stillimage', // Optimize for still image
                    '-c:a aac', // Audio codec
                    '-b:a 192k', // Audio bitrate
                    '-pix_fmt yuv420p', // Pixel format for compatibility
                    '-shortest' // Stop when audio ends
                ])
                .save(videoPath)
                .on('end', () => {
                    // Cleanup input files
                    try {
                        fs.unlinkSync(audioPath);
                        fs.unlinkSync(imagePath);
                    } catch (e) {
                        console.warn('Failed to cleanup temp input files:', e);
                    }
                    resolve(videoPath);
                })
                .on('error', (err) => {
                    console.error('Error generating video:', err);
                    // Cleanup all files on error
                    try {
                        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                    } catch (cleanupErr) { /* ignore */ }
                    reject(err);
                });
        });

    } catch (error) {
        // Ensure cleanup
        try {
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (e) { /* ignore */ }
        throw error;
    }
}
