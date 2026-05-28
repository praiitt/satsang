import axios from 'axios';

const testData = {
    day: 15, month: 6, year: 1990, hour: 14, min: 30, lat: 28.6139, lon: 77.2090, tzone: 5.5
};

const baseURL = 'https://json.astrologyapi.com/v1/astro_details';
const token = 'ak-6d935adeaea76dfcab66dfbd5e1363182f09b411';

async function tryAuth(name, config) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        const res = await axios.post(baseURL, testData, { ...config, timeout: 5000 });
        console.log(`✅ Success! Status: ${res.status}`);
        return true;
    } catch (err) {
        console.log(`❌ Failed: ${err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message}`);
        return false;
    }
}

async function runTests() {
    if (await tryAuth('Token prefix', { headers: { 'Authorization': `Token ${token}` } })) return;
}

runTests();
