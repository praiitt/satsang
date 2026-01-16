/**
 * Comprehensive auth flow diagnostic
 * Tests each step to find where auth is breaking
 */

const fetch = require('node-fetch');

async function diagnoseAuth() {
    console.log('🔍 AUTH FLOW DIAGNOSTIC\n');
    console.log('='.repeat(60));

    // Step 1: Test auth-server /auth/me endpoint directly
    console.log('\n📍 Step 1: Test auth-server /auth/me (no cookies)');
    console.log('Expected: 401 Unauthorized\n');

    try {
        const response1 = await fetch('http://localhost:4000/auth/me');
        console.log(`Status: ${response1.status} ${response1.statusText}`);
        const data1 = await response1.json().catch(() => ({}));
        console.log('Response:', data1);
    } catch (e) {
        console.error('Error:', e.message);
    }

    console.log('\n' + '='.repeat(60));

    // Step 2: Check if any session cookies exist in browser
    console.log('\n📍 Step 2: Manual Cookie Check');
    console.log('ACTION REQUIRED: Open DevTools in your browser');
    console.log('1. Go to: Application → Cookies → http://localhost:3001');
    console.log('2. Look for a cookie named "session"');
    console.log('3. Copy the cookie value');
    console.log('\nIf you have a session cookie, run this script again with:');
    console.log('  COOKIE="session=<value>" node diagnose-auth.js\n');

    const cookieValue = process.env.COOKIE;

    if (cookieValue) {
        console.log('\n' + '='.repeat(60));
        console.log('\n📍 Step 3: Test auth-server /auth/me WITH cookie');
        console.log(`Cookie: ${cookieValue.substring(0, 50)}...\n`);

        try {
            const response2 = await fetch('http://localhost:4000/auth/me', {
                headers: {
                    'Cookie': cookieValue
                }
            });
            console.log(`Status: ${response2.status} ${response2.statusText}`);
            const data2 = await response2.json().catch(() => ({}));
            console.log('Response:', JSON.stringify(data2, null, 2));

            if (response2.ok && data2.uid) {
                console.log(`\n✅ SUCCESS! Auth works with cookie`);
                console.log(`   User ID: ${data2.uid}`);
                console.log(`   Phone: ${data2.phoneNumber || 'N/A'}`);
                console.log(`   Email: ${data2.email || 'N/A'}`);
            } else {
                console.log(`\n❌ FAILED! Cookie not accepted`);
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📍 Step 4: Check getCurrentUser implementation');
    console.log('Location: lib/auth-api.ts');
    console.log('This function should:');
    console.log('  1. Receive cookies from Next.js API route');
    console.log('  2. Forward them to http://localhost:4000/auth/me');
    console.log('  3. Return user object or null\n');

    console.log('Next steps:');
    console.log('  1. Check your Next.js terminal for debug logs');
    console.log('  2. Look for: [My Tracks API] ===== AUTH DEBUG =====');
    console.log('  3. Share those logs to see what cookies are being passed\n');
}

diagnoseAuth();
