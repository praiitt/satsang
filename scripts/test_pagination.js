
const fetch = require('node-fetch');

async function testPagination() {
    const baseUrl = 'https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-auth-server/suno/community-tracks';

    console.log('Testing Page 1 (Limit 5)...');
    const res1 = await fetch(`${baseUrl}?page=1&limit=5`);
    const data1 = await res1.json();
    console.log('Page 1 Status:', res1.status);
    console.log('Page 1 Count:', data1.tracks?.length);
    console.log('Total Items:', data1.total);

    console.log('\nTesting Page 2 (Limit 5)...');
    const res2 = await fetch(`${baseUrl}?page=2&limit=5`);
    const data2 = await res2.json();
    console.log('Page 2 Status:', res2.status);
    console.log('Page 2 Count:', data2.tracks?.length);

    if (res2.status !== 200) {
        console.error('Error on Page 2:', data2);
    }
}

testPagination();
