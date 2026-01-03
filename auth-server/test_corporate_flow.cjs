
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

async function main() {
    console.log("🚀 Starting Corporate Flow API Test (JS)...");

    let db;
    // When running from auth-server, the key is in the same dir or one level up? 
    // Step 918 showed auth-server/rraasiServiceAccount.json exists.
    const serviceAccountPath = path.resolve(process.cwd(), 'rraasiServiceAccount.json');

    if (!fs.existsSync(serviceAccountPath)) {
        console.error("❌ Service account file not found at:", serviceAccountPath);
        process.exit(1);
    }

    try {
        const serviceAccount = require(serviceAccountPath);
        const app = initializeApp({
            credential: cert(serviceAccount)
        });
        db = getFirestore(app);
        console.log("✅ Firebase Admin Initialized");
    } catch (e) {
        console.error("❌ Failed to init Firebase Admin:", e);
        process.exit(1);
    }

    const ORG_ID = 'test_org_' + Date.now();
    const orgRef = db.collection('organizations').doc(ORG_ID);

    try {
        // 1. Create Organization
        console.log(`\n1. Creating Test Organization: ${ORG_ID}`);
        await orgRef.set({
            name: "Test Corp " + Date.now(),
            domains: ["test.com"],
            adminUids: ["test_admin_uid"],
            credits: 1000,
            subscriptionStatus: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("✅ Organization created successfully.");

        // 2. Add Employees (Simulating Bulk Upload)
        console.log("\n2. Simulating Bulk Employee Invite...");
        const employees = [
            { email: "alice@test.com", role: "employee" },
            { email: "bob@test.com", role: "admin" },
            { email: "charlie@test.com", role: "employee" }
        ];

        const batch = db.batch();
        for (const emp of employees) {
            const docRef = db.collection('organization_employees').doc();
            batch.set(docRef, {
                orgId: ORG_ID,
                email: emp.email,
                role: emp.role,
                status: 'invited',
                personalCredits: 0,
                invitedAt: new Date()
            });
        }
        await batch.commit();
        console.log(`✅ Invited ${employees.length} employees.`);

        // 3. Verify Data Retrieval (Simulating Dashboard Fetch)
        console.log("\n3. Verifying Data Retrieval (Stats)...");

        // Fetch Org
        const orgSnap = await orgRef.get();
        const orgData = orgSnap.data();

        // Fetch Employees
        const empSnap = await db.collection('organization_employees').where('orgId', '==', ORG_ID).get();

        console.log("------------------------------------------------");
        console.log(`Organization: ${orgData?.name}`);
        console.log(`Credits:      ${orgData?.credits}`);
        console.log(`Total Emps:   ${empSnap.size}`);
        console.log("------------------------------------------------");

        if (empSnap.size === 3 && orgData?.credits === 1000) {
            console.log("✅ TEST PASSED: Data integrity verified.");
        } else {
            console.error("❌ TEST FAILED: Data mismatch.");
        }

        // Cleanup
        console.log("\n4. Cleaning up test data...");
        await orgRef.delete();
        const deleteBatch = db.batch();
        empSnap.docs.forEach(d => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
        console.log("✅ Cleanup complete.");

    } catch (error) {
        console.error("❌ Test Error:", error);
    }
}

main();
