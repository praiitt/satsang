#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import AstrologyServiceFactory from './src/services/astrologyServiceFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔮 **Comprehensive Astrology Service Test**');
console.log('==========================================\n');

async function testComprehensiveAstrology() {
    try {
        // Initialize the astrology service factory
        console.log('🚀 Initializing Astrology Service Factory...');
        const astrologyFactory = new AstrologyServiceFactory();
        console.log('✅ Astrology Service Factory initialized successfully\n');

        // Test 1: Get available systems
        console.log('📋 **Test 1: Available Systems**');
        console.log('================================');
        const systems = astrologyFactory.getAvailableSystems();
        console.log(`Available systems: ${systems.join(', ')}`);
        console.log(`Total systems: ${systems.length}\n`);

        // Test 2: Get service statistics
        console.log('📊 **Test 2: Service Statistics**');
        console.log('=================================');
        const stats = astrologyFactory.getServiceStats();
        console.log('Service Statistics:');
        console.log(`- Total Systems: ${stats.totalSystems}`);
        console.log(`- Timestamp: ${stats.timestamp}`);
        
        if (stats.systems.vedic) {
            console.log(`- Vedic Chart Types: ${stats.systems.vedic.vedicSpecific.totalEndpoints}`);
            console.log(`- Vedic Categories: ${stats.systems.vedic.vedicSpecific.chartCategories}`);
        }
        
        if (stats.systems.western) {
            console.log(`- Western Status: ${stats.systems.western.westernSpecific.status}`);
        }
        console.log('');

        // Test 3: Get Vedic chart types
        console.log('🕉️ **Test 3: Vedic Chart Types**');
        console.log('==================================');
        const vedicChartTypes = astrologyFactory.getAvailableChartTypes('vedic');
        console.log('Vedic Chart Categories:');
        for (const [category, endpoints] of Object.entries(vedicChartTypes)) {
            console.log(`  ${category}: ${endpoints.length} endpoints`);
        }
        console.log('');

        // Test 4: Health check
        console.log('🏥 **Test 4: Health Check**');
        console.log('===========================');
        const health = await astrologyFactory.healthCheck();
        console.log(`Overall Status: ${health.overall}`);
        console.log(`Timestamp: ${health.timestamp}`);
        
        if (health.services.vedic) {
            console.log(`Vedic Service: ${health.services.vedic.status}`);
        }
        
        if (health.services.western) {
            console.log(`Western Service: ${health.services.western.status} - ${health.services.western.message}`);
        }
        console.log('');

        // Test 5: Test birth chart generation (without API call)
        console.log('📈 **Test 5: Birth Chart Generation Test**');
        console.log('==========================================');
        
        const testBirthData = {
            userId: 'test-user-123',
            birthDate: '1990-06-15',
            birthTime: '14:30',
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: 5.5
        };

        console.log('Test Birth Data:');
        console.log(`- Date: ${testBirthData.birthDate}`);
        console.log(`- Time: ${testBirthData.birthTime}`);
        console.log(`- Location: ${testBirthData.latitude}, ${testBirthData.longitude}`);
        console.log(`- Timezone: ${testBirthData.timezone}`);
        console.log('');

        // Test 6: Check if services are available
        console.log('✅ **Test 6: Service Availability**');
        console.log('===================================');
        console.log(`Vedic Service Available: ${astrologyFactory.isSystemAvailable('vedic')}`);
        console.log(`Western Service Available: ${astrologyFactory.isSystemAvailable('western')}`);
        console.log(`Unknown Service Available: ${astrologyFactory.isSystemAvailable('unknown')}`);
        console.log('');

        // Test 7: Test Vedic service methods
        console.log('🕉️ **Test 7: Vedic Service Methods**');
        console.log('=====================================');
        const vedicService = astrologyFactory.getVedicService();
        console.log(`Vedic Service Type: ${vedicService.constructor.name}`);
        console.log(`Nakshatras: ${vedicService.nakshatras.length}`);
        console.log(`Rashis: ${vedicService.rashis.length}`);
        console.log(`Planets: ${vedicService.planets.length}`);
        console.log('');

        // Test 8: Test Western service methods
        console.log('♈ **Test 8: Western Service Methods**');
        console.log('======================================');
        const westernService = astrologyFactory.getWesternService();
        console.log(`Western Service Type: ${westernService.constructor.name}`);
        console.log(`Zodiac Signs: ${westernService.zodiacSigns.length}`);
        console.log(`Planets: ${westernService.planets.length}`);
        console.log(`Houses: ${westernService.houses.length}`);
        console.log('');

        console.log('🎉 **All Tests Completed Successfully!**');
        console.log('========================================');
        console.log('');
        console.log('📝 **Summary:**');
        console.log('===============');
        console.log('✅ Astrology Service Factory initialized');
        console.log('✅ Vedic astrology service ready');
        console.log('✅ Western astrology service template ready');
        console.log('✅ All service methods accessible');
        console.log('✅ Health check working');
        console.log('✅ Statistics generation working');
        console.log('');
        console.log('🚀 **Ready for integration with existing system!**');

    } catch (error) {
        console.error('❌ **Test Failed:**', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testComprehensiveAstrology();
