#!/usr/bin/env node

/**
 * Mongoose Test Script
 * 
 * This script tests the Mongoose setup, service layer, and utilities.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TESTS = [
  {
    name: 'Database Connection',
    command: 'curl -s http://localhost:3000/api/health',
    expected: '"status":"healthy"'
  },
  {
    name: 'Database Test Endpoint',
    command: 'curl -s http://localhost:3000/api/test-db',
    expected: '"success":true'
  },
  {
    name: 'Service Layer Test',
    command: 'curl -s -X POST http://localhost:3000/api/test-db',
    expected: '"success":true'
  }
];

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`⚠️ Warning: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

async function testLocalEndpoints() {
  console.log('🧪 Testing local endpoints...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    try {
      const result = await executeCommand(test.command);
      
      if (result.includes(test.expected)) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got: ${result.substring(0, 100)}...`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

async function testMongooseUtils() {
  console.log('\n🔧 Testing Mongoose utilities...\n');
  
  try {
    // Test if the utilities file exists
    const utilsPath = path.join(__dirname, '../src/lib/mongoose-utils.ts');
    if (!fs.existsSync(utilsPath)) {
      throw new Error('Mongoose utilities file not found');
    }
    console.log('✅ Mongoose utilities file exists');
    
    // Test if services file exists
    const servicesPath = path.join(__dirname, '../src/lib/services/index.ts');
    if (!fs.existsSync(servicesPath)) {
      throw new Error('Services file not found');
    }
    console.log('✅ Services file exists');
    
    // Test if database file exists
    const dbPath = path.join(__dirname, '../src/lib/database.ts');
    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file not found');
    }
    console.log('✅ Database file exists');
    
    // Test if health endpoint exists
    const healthPath = path.join(__dirname, '../src/app/api/health/route.ts');
    if (!fs.existsSync(healthPath)) {
      throw new Error('Health endpoint not found');
    }
    console.log('✅ Health endpoint exists');
    
    return true;
  } catch (error) {
    console.error(`❌ Mongoose utilities test failed: ${error.message}`);
    return false;
  }
}

async function testPackageJson() {
  console.log('\n📦 Testing package.json configuration...\n');
  
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check if mongoose is installed
    if (!packageJson.dependencies.mongoose) {
      throw new Error('Mongoose not found in dependencies');
    }
    console.log(`✅ Mongoose version: ${packageJson.dependencies.mongoose}`);
    
    // Check if scripts exist
    const requiredScripts = ['setup-mongodb', 'test-mongoose'];
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        throw new Error(`Script '${script}' not found`);
      }
    }
    console.log('✅ Required scripts exist');
    
    return true;
  } catch (error) {
    console.error(`❌ Package.json test failed: ${error.message}`);
    return false;
  }
}

async function testEnvironment() {
  console.log('\n🌍 Testing environment configuration...\n');
  
  try {
    // Check if .env.local exists
    const envPath = path.join(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
      console.warn('⚠️ .env.local file not found');
    } else {
      console.log('✅ .env.local file exists');
    }
    
    // Check if MONGODB_URI is set
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('MONGODB_URI=')) {
      console.log('✅ MONGODB_URI is configured');
    } else {
      console.warn('⚠️ MONGODB_URI not found in .env.local');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Environment test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Mongoose Setup for CV Circle...\n');
  
  let allTestsPassed = true;
  
  // Test file structure
  const utilsTest = await testMongooseUtils();
  if (!utilsTest) allTestsPassed = false;
  
  // Test package.json
  const packageTest = await testPackageJson();
  if (!packageTest) allTestsPassed = false;
  
  // Test environment
  const envTest = await testEnvironment();
  if (!envTest) allTestsPassed = false;
  
  // Test endpoints (only if server is running)
  try {
    const endpointTest = await testLocalEndpoints();
    if (endpointTest.failed > 0) allTestsPassed = false;
  } catch (error) {
    console.log('\n⚠️ Endpoint tests skipped (server not running)');
    console.log('   Start the server with: npm run dev');
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allTestsPassed) {
    console.log('✅ All Mongoose tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Test the health endpoint: curl http://localhost:3000/api/health');
    console.log('3. Test database operations: curl http://localhost:3000/api/test-db');
    console.log('4. Deploy to Vercel and test production endpoints');
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure all files are created correctly');
    console.log('2. Check your MONGODB_URI environment variable');
    console.log('3. Install dependencies: npm install');
    console.log('4. Start the server: npm run dev');
  }
  
  console.log('\n📚 Documentation:');
  console.log('- Mongoose Setup Guide: MONGOOSE_SETUP_GUIDE.md');
  console.log('- MongoDB Schema Setup: MONGODB_SCHEMA_SETUP.md');
  console.log('- Quick Setup Guide: MONGODB_QUICK_SETUP.md');
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Mongoose Test Script

Usage:
  node scripts/test-mongoose.js [options]

Options:
  --help, -h          Show this help message
  --endpoints-only    Test only the endpoints
  --files-only        Test only the file structure

Examples:
  node scripts/test-mongoose.js
  node scripts/test-mongoose.js --endpoints-only
    `);
    process.exit(0);
  }
  
  main().catch(console.error);
}

module.exports = { 
  testLocalEndpoints, 
  testMongooseUtils, 
  testPackageJson, 
  testEnvironment 
}; 