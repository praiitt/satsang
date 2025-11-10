#!/usr/bin/env node

/**
 * Script to generate VAPID keys for Web Push Notifications.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * This will generate a public and private key pair that you need to:
 * 1. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to your .env.local (public key)
 * 2. Add VAPID_PRIVATE_KEY to your server-side .env (private key - keep secret!)
 * 
 * The private key is used on the server to send push notifications.
 * The public key is used in the browser to subscribe to push notifications.
 */

const crypto = require('crypto');

function generateVAPIDKeys() {
  const curve = crypto.createECDH('prime256v1');
  curve.generateKeys();

  const publicKey = curve.getPublicKey('base64');
  const privateKey = curve.getPrivateKey('base64');

  // Convert to URL-safe base64 format (Web Push standard)
  const publicKeyBase64 = Buffer.from(publicKey, 'base64')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = Buffer.from(privateKey, 'base64')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

// Alternative method using web-push library format
function generateVAPIDKeysWebPush() {
  try {
    // Try to use web-push if available
    const webpush = require('web-push');
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    };
  } catch (e) {
    // Fallback to manual generation
    console.log('web-push not installed, using manual generation...');
    return generateVAPIDKeys();
  }
}

const keys = generateVAPIDKeysWebPush();

console.log('\n✅ VAPID Keys Generated!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`\n🔒 Add this to your server-side .env (keep it secret!):\n`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n⚠️  Important:');
console.log('   - Public key: Safe to expose in frontend (.env.local)');
console.log('   - Private key: Keep secret, only use on server');
console.log('   - Never commit private key to git!\n');

