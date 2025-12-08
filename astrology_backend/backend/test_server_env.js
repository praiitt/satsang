#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';

console.log('🔍 **Server Environment Variables Test**\n');

// Simulate how the server loads environment variables
console.log('🔄 Loading environment variables...');
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('📋 Environment Variables Check:');
console.log('=====================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`FIREBASE_ENVIRONMENT: ${process.env.FIREBASE_ENVIRONMENT || 'NOT SET'}`);
console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`);
console.log(`FIREBASE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || 'NOT SET'}`);
console.log(`FIREBASE_SERVICE_ACCOUNT_CONTENT: ${process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT ? 'SET (length: ' + process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT.length + ')' : 'NOT SET'}`);

if (process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT);
    console.log(`\n✅ Service Account Content Valid:`);
    console.log(`   Project ID: ${parsed.project_id}`);
    console.log(`   Client Email: ${parsed.client_email}`);
  } catch (error) {
    console.log(`❌ Service Account Content Parse Error: ${error.message}`);
  }
}
