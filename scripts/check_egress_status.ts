import { EgressClient, RoomServiceClient } from 'livekit-server-sdk';

const LIVEKIT_URL = 'wss://satsang-o9gv57vl.livekit.cloud';
const LIVEKIT_API_KEY = 'APILWdFRxKrWtVF';
const LIVEKIT_API_SECRET = 'M1SaLkufZVnTEB48orcnB0VsuFMwBWWvJ7y8yQG0oJG';

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

async function checkEgress() {
    console.log('Checking active egresses...');
    try {
        const active = await egressClient.listEgress({ active: true });
        console.log('Active Egresses:', active.length);
        active.forEach(e => console.log(`- ID: ${e.egressId}, Status: ${e.status}, Room: ${e.roomName}`));

        console.log('\nChecking recent finished egresses...');
        const ended = await egressClient.listEgress({ active: false });
        console.log('Recent Finished Egresses:', ended.length);
        ended.slice(0, 5).forEach(e => {
            console.log(`- ID: ${e.egressId}`);
            console.log(`  Status: ${e.status} (${e.error || 'No error'})`);
            console.log(`  Room: ${e.roomName}`);
            console.log(`  Started At: ${new Date(Number(e.startedAt) / 1000000).toISOString()}`); // Nanoseconds? No, protobuf usually sends as string but SDK might convert. Wait, let's just log raw.
            console.log(`  Details:`, JSON.stringify(e, null, 2));
        });

    } catch (error) {
        console.error('Error checking egress:', error);
    }
}

checkEgress();
