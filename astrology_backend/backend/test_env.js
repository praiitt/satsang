#!/usr/bin/env node

import fs from 'fs';

console.log('🔍 **Environment Variables Test**\n');

// Check if .env file exists
const envPath = './.env';
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  // Read and display .env content
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n📋 .env file content:');
  console.log('=====================================');
  console.log(envContent);
  
  // Check for Firebase-related variables
  const firebaseVars = envContent.split('\n').filter(line => 
    line.includes('FIREBASE') || line.includes('GOOGLE') || line.includes('NODE_ENV')
  );
  
  console.log('\n🔍 Firebase-related variables found:');
  firebaseVars.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      console.log(`   ${line}`);
    }
  });
  
} else {
  console.log('❌ .env file NOT FOUND');
}

console.log('\n📋 Current process.env variables:');
console.log('=====================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`FIREBASE_ENVIRONMENT: ${process.env.FIREBASE_ENVIRONMENT || 'NOT SET'}`);
console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`);
console.log(`FIREBASE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || 'NOT SET'}`);
console.log(`FIREBASE_SERVICE_ACCOUNT_CONTENT: ${process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT ? 'SET (length: ' + process.env.FIREBASE_SERVICE_ACCOUNT_CONTENT.length + ')' : 'NOT SET'}`);
