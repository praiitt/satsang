import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });
import { MarketingService } from '../src/services/marketing-service.js';

/**
 * WhatsApp Direct Test Script
 * Usage: npx tsx scripts/test-whatsapp.ts <phone_number> [message]
 * Example: npx tsx scripts/test-whatsapp.ts +919876543210 "Namaste! This is a spiritual test message."
 */
async function main() {
    const phone = process.argv[2];
    const message = process.argv[3] || "Namaste from RRAASI! This is a test message from our spiritual notification dashboard. 🙏";

    if (!phone) {
        console.log("\n❌ Error: Phone number is required.");
        console.log("Usage: npx tsx scripts/test-whatsapp.ts <phone_number> [message]");
        console.log("Example: npx tsx scripts/test-whatsapp.ts +919876543210 'Hello seeker!'");
        process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🚀 RRAASI WhatsApp Test');
    console.log('='.repeat(60));
    console.log(`📱 Target: ${phone}`);
    console.log(`📝 Message: ${message}`);
    console.log('='.repeat(60) + '\n');

    try {
        console.log('⏳ Sending message via Twilio...');
        const stats = await MarketingService.sendBulkWhatsApp(
            [{ phone, name: 'Seeker' }],
            message
        );

        if (stats.success > 0) {
            console.log("\n✅ SUCCESS!");
            console.log("  - SID:", stats.details[0].sid);
            console.log("  - Status:", stats.details[0].status);
        } else {
            console.log("\n❌ FAILED!");
            console.log("  - Error:", stats.details[0].error);
        }
        
        console.log("\n📊 Stats:", JSON.stringify(stats, null, 2));
    } catch (error: any) {
        console.error("\n❌ Fatal Error:", error.message);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Fatal exception:", err);
    process.exit(1);
});
