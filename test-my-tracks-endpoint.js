// Diagnostic: Test my-tracks endpoint locally
const fetch = require('node-fetch');

async function testMyTracks() {
    try {
        const url = 'http://localhost:4000/suno/my-tracks';

        console.log(`Testing: ${url}\n`);

        const response = await fetch(url, {
            headers: {
                // You'll need to add your session cookie here for auth
                'Accept': 'application/json'
            }
        });

        console.log(`Status: ${response.status}`);
        console.log(`Status Text: ${response.statusText}\n`);

        const data = await response.json();
        console.log(`Response:`, JSON.stringify(data, null, 2));

        if (data.tracks) {
            console.log(`\nTracks count: ${data.tracks.length}`);
            data.tracks.forEach((track, i) => {
                console.log(`\nTrack ${i + 1}:`);
                console.log(`  Title: ${track.title}`);
                console.log(`  Has audioUrl: ${!!track.audioUrl}`);
                console.log(`  AudioURL: ${track.audioUrl?.substring(0, 50)}...`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMyTracks();
