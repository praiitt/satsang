import axios from 'axios';

const testData = {
    day: 15, month: 6, year: 1990, hour: 14, min: 30, lat: 28.6139, lon: 77.2090, tzone: 5.5
};

const baseURL = 'https://json.astrologyapi.com/v1/astro_details';
const token = 'ak-8517813489f36f58a79358216702c27bae1c08d0';

async function runTests() {
    try {
        console.log(`\n--- Testing x-astrologyapi-key ---`);
        const res = await axios.post(baseURL, testData, { 
            headers: { 'x-astrologyapi-key': token },
            timeout: 5000 
        });
        console.log(`✅ Success! Status: ${res.status}`);
    } catch (err) {
        console.log(`❌ Failed: ${err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message}`);
    }
}

runTests();
