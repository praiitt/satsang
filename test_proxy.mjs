import fetch from 'node-fetch';

async function testProxyWithCookie() {
    const targetUrl = 'https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-marketing-server/ads/briefs';
    console.log("Testing Cloud Function WITH Cookie:", targetUrl);
    
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': '__session=mock_fake_session_cookie_that_forces_verification'
        }
    };

    try {
        const response = await fetch(targetUrl, options);
        console.log(`STATUS: ${response.status}`);
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            console.log("JSON DATA:", await response.json());
        } else {
            console.log("TEXT DATA:", await response.text());
        }
    } catch (e) {
        console.error("FATAL ERROR CAUGHT:", e.message);
    }
}

testProxyWithCookie();
