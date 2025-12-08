#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 **Credentials Debug Script**\n');

console.log('📋 **Environment Variables Check:**');
console.log('==================================');
console.log(`ASTROLOGY_API_KEY: ${process.env.ASTROLOGY_API_KEY ? 'SET (' + process.env.ASTROLOGY_API_KEY.length + ' chars)' : 'NOT SET'}`);
console.log(`ASTROLOGY_USER_ID: ${process.env.ASTROLOGY_USER_ID || 'NOT SET'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`FIREBASE_ENVIRONMENT: ${process.env.FIREBASE_ENVIRONMENT || 'NOT SET'}`);

console.log('\n🔑 **Credential Format Check:**');
console.log('================================');
const apiKey = process.env.ASTROLOGY_API_KEY;
const userId = process.env.ASTROLOGY_USER_ID;

if (apiKey && userId) {
    const authString = `${userId}:${apiKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    console.log(`Raw credentials: ${userId}:${apiKey.substring(0, 10)}...`);
    console.log(`Base64 encoded: ${base64Auth}`);
    console.log(`Decoded back: ${Buffer.from(base64Auth, 'base64').toString()}`);
    
    // Test the exact format used in the comprehensive service
    console.log('\n🧪 **Testing Comprehensive Service Format:**');
    console.log('============================================');
    
    const testPayload = {
        day: 15,
        month: 6,
        year: 1990,
        hour: 14,
        min: 30,
        lat: 28.6139,
        lon: 77.209,
        tzone: 5.5
    };
    
    console.log('Test payload:', JSON.stringify(testPayload, null, 2));
    console.log('Headers:', {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json'
    });
}
