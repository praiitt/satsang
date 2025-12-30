
import { config } from 'dotenv';
import * as path from 'path';

// Load env vars
config({ path: path.resolve(process.cwd(), '../.env.local') });

const API_KEY = process.env.SUNO_API_KEY;
const BASE_URL = 'https://api.sunoapi.org/api/v1'; // Trying v1 as per client code

async function probeEndpoint(name: string, endpoint: string) {
    try {
        console.log(`\nProbing [${name}] ${BASE_URL}${endpoint}...`);
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[${name}] Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            // console.log(`[${name}] Data:`, JSON.stringify(data).substring(0, 200));

            if (Array.isArray(data)) {
                console.log(`✅ [${name}] Returns ARRAY of ${data.length} items.`);
                if (data.length > 0) console.log('Sample:', data[0]);
            } else if (data && typeof data === 'object') {
                console.log(`✅ [${name}] Returns OBJECT keys:`, Object.keys(data));
                // Check common wrapper patterns
                if (Array.isArray(data.data)) {
                    console.log(`   Has 'data' array with ${data.data.length} items`);
                }
                if (Array.isArray(data.tasks)) console.log(`   Has 'tasks' array`);
            }
        } else {
            const text = await response.text();
            console.log(`❌ [${name}] Error Body:`, text.substring(0, 100));
        }

    } catch (error) {
        console.error(`❌ [${name}] Exception:`, error);
    }
}

async function main() {
    if (!API_KEY) {
        console.error('SUNO_API_KEY not found in env');
        return;
    }

    // Try various endpoints found in unofficial docs/forums
    await probeEndpoint('Limit', '/get_limit'); // Basic auth check
    await probeEndpoint('Get Task Ids', '/get_task_ids'); // Often returns list of all task IDs
    await probeEndpoint('Get (No ID)', '/get'); // Sometimes returns list
    await probeEndpoint('History', '/history');
    await probeEndpoint('Tasks', '/tasks');
    await probeEndpoint('User Records', '/user/records');
}

main();
