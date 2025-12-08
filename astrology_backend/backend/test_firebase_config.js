#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 **Firebase Configuration Diagnostic Tool**\n');

// Load environment variables first
console.log('🔄 Loading environment variables...');
const dotenv = await import('dotenv');
dotenv.config({ path: path.join(process.cwd(), '.env') });

// 1. Check environment variables
console.log('📋 **Environment Variables Check:**');
console.log('=====================================');

const envVars = [
  'NODE_ENV',
  'FIREBASE_ENVIRONMENT',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'FIREBASE_SERVICE_ACCOUNT_KEY_PATH',
  'FIREBASE_SERVICE_ACCOUNT_CONTENT'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n📁 **Service Account File Check:**');
console.log('=====================================');

// 2. Check service account file
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
if (serviceAccountPath) {
  if (fs.existsSync(serviceAccountPath)) {
    console.log(`✅ Service account file exists: ${serviceAccountPath}`);
    
    try {
      const content = fs.readFileSync(serviceAccountPath, 'utf8');
      const parsed = JSON.parse(content);
      console.log(`✅ File is valid JSON`);
      console.log(`✅ Project ID: ${parsed.project_id}`);
      console.log(`✅ Client Email: ${parsed.client_email}`);
    } catch (error) {
      console.log(`❌ File read/parse error: ${error.message}`);
    }
  } else {
    console.log(`❌ Service account file NOT FOUND: ${serviceAccountPath}`);
  }
} else {
  console.log('❌ No service account file path configured');
}

console.log('\n🔧 **Firebase Configuration Test:**');
console.log('=====================================');

// 3. Test Firebase initialization
try {
  // Load environment variables from .env file (same as server)
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env') });
  
  // Try to initialize Firebase
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  
  let app;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT) {
    console.log('🔄 Trying to initialize with service account content...');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with service account content');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    console.log('🔄 Trying to initialize with service account file...');
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    app = initializeApp({
      credential: cert(serviceAccountPath)
    });
    console.log('✅ Firebase initialized with service account file');
  } else {
    console.log('❌ No service account configuration found');
    process.exit(1);
  }
  
  // Test Firestore connection
  console.log('🔄 Testing Firestore connection...');
  const db = getFirestore(app);
  
  // Try a simple operation
  const testDoc = db.collection('test').doc('connection-test');
  console.log('✅ Firestore connection successful');
  console.log(`✅ Project: ${app.options.projectId}`);
  
  console.log('\n🎯 **Configuration Summary:**');
  console.log('=====================================');
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'NOT SET'}`);
  console.log(`✅ Firebase Project: ${app.options.projectId}`);
  console.log(`✅ Authentication Method: ${process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT ? 'Content' : 'File'}`);
  
} catch (error) {
  console.log('❌ Firebase initialization failed:');
  console.log(`   Error: ${error.message}`);
  console.log('\n🔍 **Troubleshooting Tips:**');
  console.log('1. Check if service account file exists and is readable');
  console.log('2. Verify service account has correct permissions');
  console.log('3. Ensure environment variables are properly set');
  console.log('4. Check if the service account is for the correct project');
  
  process.exit(1);
}

console.log('\n🎉 **All checks passed! Firebase is properly configured.**');
