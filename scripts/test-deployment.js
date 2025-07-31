#!/usr/bin/env node

/**
 * Deployment Test Script
 * 
 * This script helps test if your Vercel deployment is working correctly.
 * Run this after deploying to verify all endpoints are functional.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const ENDPOINTS = [
  '/api/test-db',
  '/api/auth/login',
  '/'
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔍 Testing: ${url}`);
  
  try {
    const result = await makeRequest(url);
    
    if (result.status === 200) {
      console.log(`✅ ${endpoint} - Status: ${result.status}`);
      
      if (endpoint === '/api/test-db') {
        if (result.data.success) {
          console.log(`   📊 Database connection: ✅ Working`);
          console.log(`   👥 User count: ${result.data.data?.userCount || 'N/A'}`);
          console.log(`   🔧 Environment: ${result.data.data?.envInfo?.nodeEnv || 'N/A'}`);
        } else {
          console.log(`   ❌ Database connection: Failed`);
          console.log(`   📝 Error: ${result.data.message}`);
        }
      }
      
      if (endpoint === '/api/auth/login') {
        console.log(`   🔐 Login endpoint: ✅ Responding`);
      }
      
      if (endpoint === '/') {
        console.log(`   🏠 Homepage: ✅ Loading`);
      }
      
    } else {
      console.log(`❌ ${endpoint} - Status: ${result.status}`);
      console.log(`   📝 Response: ${JSON.stringify(result.data, null, 2)}`);
    }
    
  } catch (error) {
    console.log(`❌ ${endpoint} - Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting deployment tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n📋 Test Summary:');
  console.log('1. Check if database connection is working');
  console.log('2. Verify API endpoints are responding');
  console.log('3. Ensure homepage loads correctly');
  console.log('\n💡 If tests fail, check:');
  console.log('   - Environment variables in Vercel');
  console.log('   - MongoDB Atlas configuration');
  console.log('   - Vercel function logs');
  console.log('   - Network connectivity');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint }; 