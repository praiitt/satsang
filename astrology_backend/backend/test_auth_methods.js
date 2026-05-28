import axios from 'axios';

const testData = {
    day: 15, month: 6, year: 1990, hour: 14, min: 30, lat: 28.6139, lon: 77.2090, tzone: 5.5
};

const baseURL = 'https://json.astrologyapi.com/v1/astro_details';
const token = 'ak-6d935adeaea76dfcab66dfbd5e1363182f09b411';
const userId = '646865';

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
    // 1. Bearer Token
    if (await tryAuth('Bearer Token', { headers: { 'Authorization': `Bearer ${token}` } })) return;
    
    // 2. Token directly in Authorization
    if (await tryAuth('Direct Token', { headers: { 'Authorization': token } })) return;
    
    // 3. Basic Auth with User ID and Token
    if (await tryAuth('Basic (UserId + Token)', { auth: { username: userId, password: token } })) return;
    
    // 4. Basic Auth with User ID and Token but manual header
    const creds = Buffer.from(`${userId}:${token}`).toString('base64');
    if (await tryAuth('Basic Manual', { headers: { 'Authorization': `Basic ${creds}` } })) return;
}

runTests();
