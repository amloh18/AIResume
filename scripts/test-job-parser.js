#!/usr/bin/env node

const axios = require('axios');

async function testJobParser() {
  console.log('🧪 Testing Job Parser API...\n');

  const testUrl = 'https://www.indeed.com/viewjob?jk=test123';
  
  try {
    console.log('📡 Testing job parsing with Indeed URL...');
    
    const response = await axios.post('http://localhost:3000/api/parse-job', {
      url: testUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Job parser test successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Job parser test failed!');
    if (error.response) {
      console.log('📊 Error response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('🚨 Error:', error.message);
    }
  }
}

async function testGetParsedJobs() {
  console.log('\n📋 Testing Get Parsed Jobs API...\n');
  
  try {
    console.log('📡 Fetching parsed jobs...');
    
    const response = await axios.get('http://localhost:3000/api/jobs/parsed');
    
    console.log('✅ Get parsed jobs test successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Get parsed jobs test failed!');
    if (error.response) {
      console.log('📊 Error response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('🚨 Error:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Job Parser Tests...\n');
  
  await testJobParser();
  await testGetParsedJobs();
  
  console.log('\n✨ All tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testJobParser, testGetParsedJobs }; 