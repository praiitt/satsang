import fetch from 'node-fetch';

const userId = "test-user-123";
const birthData = {
  name: "Test",
  day: 1,
  month: 1,
  year: 1990,
  hour: 12,
  minute: 0,
  latitude: 28.7041,
  longitude: 77.1025,
  timezone: 5.5
};

async function testApi() {
  try {
    console.log("Testing POST /api/astrology/daily-insights...");
    const res = await fetch('http://localhost:3002/api/astrology/daily-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, birthData })
    });
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testApi();
