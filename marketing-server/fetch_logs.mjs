import { google } from 'googleapis';
import fs from 'fs';

async function getLogs() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFilename: './rraasiServiceAccount.json',
      scopes: ['https://www.googleapis.com/auth/logging.read']
    });

    const logging = google.logging({ version: 'v2', auth });
    
    // Look at the latest logs from Cloud Run / Cloud Functions for marketing server
    const filter = `resource.labels.service_name="satsang-marketing-server" OR resource.labels.function_name="satsang-marketing-server" AND severity>="ERROR"`;
    
    console.log("Fetching logs with filter:", filter);
    const res = await logging.entries.list({
      requestBody: {
        resourceNames: ['projects/rraasi-8a619'],
        filter: filter,
        orderBy: 'timestamp desc',
        pageSize: 10
      }
    });

    if (res.data.entries && res.data.entries.length > 0) {
      res.data.entries.forEach(entry => {
        console.log(`\n[${entry.timestamp}] ${entry.severity}`);
        if (entry.textPayload) console.log(entry.textPayload);
        if (entry.jsonPayload) console.log(JSON.stringify(entry.jsonPayload, null, 2));
      });
    } else {
      console.log('No recent errors found in satsang-marketing-server logs.');
    }
  } catch (e) {
    console.error('Error fetching logs:', e.message);
  }
}

getLogs();
