const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./rraasi-8a619-firebase-adminsdk-fbsvc-bd6fa65b73.json'); // Let's find the correct key path first

// Wait, I should just grep next.js logs for "Music Generate" or "Satsang Generate". Let's try that.
