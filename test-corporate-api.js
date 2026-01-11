const crypto = require('crypto');

// MOCKING the flow because standard login is hard in script without UI
// However, since we have the AUTH_SERVER_URL running locally, we can try to
// hit the endpoints. But we are blocked by `requireAuth` needing a Bearer token.
// The only way to get a Bearer token for a test script is to use Admin SDK to generate a custom token,
// then exchange it for ID token via Google Identity Toolkit REST API.

// Setup
// Node 18+ has global fetch
// Node 18+ has global fetch
const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                const val = values.join('=').trim().replace(/^['"]|['"]$/g, ''); // Simple cleanup
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = val;
                }
            }
        });
        console.log('✅ Loaded .env.local');
    }
} catch (e) {
    console.warn('⚠️ Could not load .env.local', e);
}
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Initialize Admin
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './rraasiServiceAccount.json');
const adminApp = initializeApp({
    credential: cert(serviceAccount)
}, 'test-admin');

const auth = getAuth(adminApp);
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const API_URL = 'http://localhost:4000'; // Auth Server

async function runTest() {
    try {
        console.log('🧪 Starting Corporate API Integration Test...');

        // 1. Create a Random Test User
        const randomId = crypto.randomBytes(4).toString('hex');
        const email = `test.corp.${randomId}@acme-test.com`;
        const password = 'TestPassword123!';

        console.log(`👤 Creating test user: ${email}`);
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: 'Test Corp Admin'
        });
        const uid = userRecord.uid;

        // 2. Get ID Token using Custom Token Exchange (standard pattern for backend testing)
        // a. Create custom token
        const customToken = await auth.createCustomToken(uid);

        // b. Exchange for ID token via REST API
        const tokenRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true })
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.idToken) {
            throw new Error(`Failed to get ID token: ${JSON.stringify(tokenData)}`);
        }
        const idToken = tokenData.idToken;
        console.log('🔑 ID Token acquired');

        // 3. Test: Create Organization
        console.log('🏢 Testing: POST /corporate/create');
        const createRes = await fetch(`${API_URL}/corporate/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                name: 'Acme Test Corp',
                workEmail: email // acme-test.com domain
            })
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            throw new Error(`Create Org Failed: ${createRes.status} ${err}`);
        }

        const orgData = await createRes.json();
        console.log('✅ Organization Created:', orgData.id);

        // 4. Test: Invite Employee
        console.log('📧 Testing: POST /corporate/invite');
        const inviteEmail = `employee.${randomId}@acme-test.com`;
        const inviteRes = await fetch(`${API_URL}/corporate/${orgData.id}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                email: inviteEmail,
                role: 'corporate_employee'
            })
        });

        if (!inviteRes.ok) {
            const err = await inviteRes.text();
            throw new Error(`Invite Failed: ${inviteRes.status} ${err}`);
        }

        const inviteData = await inviteRes.json();
        console.log('✅ Invite Sent. Token:', inviteData.token);

        // 5. Test: Join
        console.log('🤝 Testing: POST /corporate/join (Token)');
        // Need a new user for the employee
        const empUid = `emp_${randomId}`;
        const empCustomToken = await auth.createCustomToken(empUid, { email: inviteEmail });
        // Exchange
        const empTokenRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: empCustomToken, returnSecureToken: true })
        });
        const empAuth = await empTokenRes.json();
        const empIdToken = empAuth.idToken;

        const joinRes = await fetch(`${API_URL}/corporate/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${empIdToken}`
            },
            body: JSON.stringify({
                token: inviteData.token
            })
        });

        if (!joinRes.ok) {
            const err = await joinRes.text();
            throw new Error(`Join Failed: ${joinRes.status} ${err}`);
        }
        const joinData = await joinRes.json();
        console.log('✅ Joined successfully:', joinData);

        console.log('🎉 ALL INTEGRATION TESTS PASSED');

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

runTest();
