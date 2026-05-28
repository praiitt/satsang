#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔮 **Astrology API Credentials Test**');
console.log('=====================================\n');

async function testAstrologyAPI() {
    try {
        const apiKey = process.env.ASTROLOGY_API_KEY;
        const userId = process.env.ASTROLOGY_USER_ID;
        
        console.log('📋 **Environment Variables Check:**');
        console.log('==================================');
        console.log(`ASTROLOGY_API_KEY: ${apiKey ? 'SET (' + apiKey.length + ' chars)' : 'NOT SET'}`);
        console.log(`ASTROLOGY_USER_ID: ${userId || 'NOT SET'}`);
        console.log('');

        if (!apiKey || !userId) {
            console.log('❌ Missing required environment variables');
            return;
        }

        console.log('🚀 **Testing Astrology API Connection:**');
        console.log('=======================================');
        
        const baseURL = 'https://json.astrologyapi.com/v1';
        const testEndpoint = 'astro_details';
        
        console.log(`Testing endpoint: ${baseURL}/${testEndpoint}`);
        console.log(`Using credentials: ${userId}:${apiKey.substring(0, 10)}...`);
        console.log('');

        const testData = {
            day: 15,
            month: 6,
            year: 1990,
            hour: 14,
            min: 30,
            lat: 28.6139,
            lon: 77.2090,
            tzone: 5.5
        };

        const reqConfig = {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (apiKey.startsWith('ak-')) {
            reqConfig.headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            reqConfig.auth = {
                username: userId,
                password: apiKey
            };
        }

        const response = await axios.post(`${baseURL}/${testEndpoint}`, testData, reqConfig);

        console.log('✅ **API Test Successful!**');
        console.log('==========================');
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        console.log('');

        // Test a more complex endpoint
        console.log('🔮 **Testing Birth Chart Endpoint:**');
        console.log('====================================');
        
        const birthData = {
            day: 15,
            month: 6,
            year: 1990,
            hour: 14,
            min: 30,
            lat: 28.6139,
            lon: 77.2090,
            tzone: 5.5
        };

        console.log('Birth Data:', JSON.stringify(birthData, null, 2));
        console.log('');

        const chartReqConfig = {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (apiKey.startsWith('ak-')) {
            chartReqConfig.headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            chartReqConfig.auth = {
                username: userId,
                password: apiKey
            };
        }

        const chartResponse = await axios.post(`${baseURL}/birth_details`, birthData, chartReqConfig);

        console.log('✅ **Birth Chart Test Successful!**');
        console.log('==================================');
        console.log(`Status: ${chartResponse.status}`);
        console.log(`Response Size: ${JSON.stringify(chartResponse.data).length} characters`);
        console.log('Sample Data:', JSON.stringify(chartResponse.data, null, 2).substring(0, 500) + '...');
        console.log('');

        console.log('🎉 **All Tests Passed! Astrology API is working correctly.**');

    } catch (error) {
        console.error('❌ **Test Failed:**', error.message);
        
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            console.error('No response received from API');
        }
        
        console.error('Stack:', error.stack);
    }
}

// Run the test
testAstrologyAPI();
