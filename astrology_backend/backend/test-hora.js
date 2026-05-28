import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ASTROLOGY_API_KEY;

const data = {
  day: 25,
  month: 5,
  year: 2026,
  hour: 12,
  min: 0,
  lat: 28.7041,
  lon: 77.1025,
  tzone: 5.5
};

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`https://json.astrologyapi.com/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'x-astrologyapi-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const json = await response.json();
    console.log(`Endpoint: ${endpoint}`);
    console.log(JSON.stringify(json, null, 2));
    console.log('-----------------------------------');
  } catch (err) {
    console.error(err);
  }
}

testEndpoint('choghadiya_muhurta');
testEndpoint('hora_muhurta');
