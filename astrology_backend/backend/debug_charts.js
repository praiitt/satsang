import { firestoreRAGService } from './src/services/firestoreRAGService.js';

async function debugCharts() {
  try {
    const userId = 'uDkylEmMWPQn6xRBydQb16ltUle2';
    console.log('Testing firestoreRAGService.getAllUserCharts...');
    
    const result = await firestoreRAGService.getAllUserCharts(userId);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Also test the raw firestoreService
    const rawCharts = await firestoreRAGService.firestoreService.getUserCharts(userId);
    console.log('Raw charts from firestoreService:');
    rawCharts.forEach((chart, index) => {
      console.log(`Chart ${index}:`, {
        id: chart.id,
        type: chart.type,
        hasData: !!chart.data,
        keys: Object.keys(chart)
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCharts();
