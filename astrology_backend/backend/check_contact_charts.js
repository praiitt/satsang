/**
 * Script to check how many charts were imported for contacts
 * and where they are stored
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = await import('./src/serviceAccountKey.json', { assert: { type: 'json' } });
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount.default)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    console.log('Make sure serviceAccountKey.json exists in the backend/src directory');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkContactCharts() {
  try {
    console.log('=== Checking Contact Charts Storage ===\n');
    
    // Get user ID from command line or use a test user
    const userId = process.argv[2] || 'AttwxHTknIWuYvFvhlLTOT0CZzy2';
    console.log(`Checking charts for user: ${userId}\n`);
    
    // Query contacts collection
    const contactsRef = db.collection('contacts');
    const query = contactsRef.where('userId', '==', userId);
    const querySnapshot = await query.get();
    
    if (querySnapshot.empty) {
      console.log('❌ No contacts found for this user.');
      return;
    }
    
    console.log(`📋 Found ${querySnapshot.size} contact(s):\n`);
    
    let totalCharts = 0;
    let contactsWithCharts = 0;
    
    let index = 0;
    querySnapshot.forEach((doc) => {
      const contact = doc.data();
      const chartData = contact.chartData;
      index++;
      
      console.log(`${index}. Contact: ${contact.name || 'Unknown'}`);
      console.log(`   Contact ID: ${contact.contactId || 'N/A'}`);
      console.log(`   Document ID: ${doc.id}`);
      
      if (chartData) {
        const chartCount = Array.isArray(chartData) ? chartData.length : (chartData ? 1 : 0);
        totalCharts += chartCount;
        contactsWithCharts++;
        
        console.log(`   ✅ Charts stored: ${chartCount}`);
        
        if (Array.isArray(chartData)) {
          const chartTypes = chartData.map(chart => chart.type || 'unknown').join(', ');
          console.log(`   Chart types: ${chartTypes}`);
          
          // Show first chart structure
          if (chartData.length > 0) {
            console.log(`   First chart structure:`);
            const firstChart = chartData[0];
            console.log(`     - Type: ${firstChart.type || 'N/A'}`);
            console.log(`     - Has data: ${firstChart.data ? 'Yes' : 'No'}`);
            console.log(`     - Keys: ${Object.keys(firstChart).slice(0, 5).join(', ')}...`);
          }
        } else {
          console.log(`   Chart type: ${typeof chartData}`);
          console.log(`   Chart keys: ${Object.keys(chartData).slice(0, 5).join(', ')}...`);
        }
        
        if (contact.chartDataUpdatedAt) {
          console.log(`   Last updated: ${contact.chartDataUpdatedAt}`);
        }
      } else {
        console.log(`   ❌ No charts stored`);
      }
      
      if (contact.birthData) {
        const birthData = typeof contact.birthData === 'string' 
          ? JSON.parse(contact.birthData) 
          : contact.birthData;
        console.log(`   Birth Data: ${birthData.name || 'N/A'} - ${birthData.day}/${birthData.month}/${birthData.year}`);
      }
      
      console.log('');
    });
    
    console.log('=== Summary ===');
    console.log(`Total contacts: ${querySnapshot.size}`);
    console.log(`Contacts with charts: ${contactsWithCharts}`);
    console.log(`Total charts stored: ${totalCharts}`);
    console.log(`\n📍 Storage Location: Firestore collection 'contacts'`);
    console.log(`   Document format: {userId}_{contactId}`);
    console.log(`   Chart data field: 'chartData' (array)`);
    
  } catch (error) {
    console.error('Error checking contact charts:', error);
    process.exit(1);
  }
}

// Run the check
checkContactCharts().then(() => {
  console.log('\n✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

