#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { firestoreRAGService } from './src/services/firestoreRAGService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project .env
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const userId = `pine_test_${Date.now()}`;
  console.log(`\n🔎 Pinecone RAG Sanity Test (userId=${userId})\n`);

  // Minimal mock chart data
  const astroDetails = {
    type: 'astro_details',
    userId,
    name: 'Pine Test User',
    sun_sign: 'Cancer',
    moon_sign: 'Libra',
    ascendant: 'Scorpio',
    birth_date: '1990-06-15',
    birth_time: '14:30',
    birth_place: 'New Delhi',
    details: 'Test data for Pinecone sanity check'
  };

  const planets = {
    type: 'planets',
    userId,
    planets: [
      { name: 'Sun', sign: 'Cancer', house: '10', degree: '25.5' },
      { name: 'Moon', sign: 'Libra', house: '1', degree: '15.2' }
    ]
  };

  try {
    console.log('⬆️  Upserting astro_details...');
    const up1 = await firestoreRAGService.storeChartData(userId, astroDetails);
    console.log('   ', up1);

    console.log('⬆️  Upserting planets...');
    const up2 = await firestoreRAGService.storeChartData(userId, planets);
    console.log('   ', up2);

    console.log('\n🔍 Querying for: "What is my sun sign and moon sign?"');
    const q = await firestoreRAGService.searchChartsByQuery(userId, 'What is my sun sign and moon sign?');

    if (q.success) {
      const types = Object.keys(q.charts || {});
      console.log('✅ Query success');
      console.log('   totalResults:', q.totalResults);
      console.log('   chartTypes:', types);
      types.forEach(t => {
        const arr = q.charts[t] || [];
        const preview = (arr[0]?.content || '').slice(0, 100).replace(/\n/g, ' ');
        console.log(`   - ${t}: ${arr.length} docs (preview: ${preview}...)`);
      });
    } else {
      console.log('⚠️ Query returned no results:', q.message || q.error);
    }

    console.log('\n🎉 Pinecone RAG sanity test completed.');
  } catch (err) {
    console.error('\n❌ Pinecone test failed:', err?.response?.data || err?.message || err);
    process.exit(1);
  }
}

main();


