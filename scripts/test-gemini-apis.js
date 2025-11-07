#!/usr/bin/env node

/**
 * Test Script for Gemini API Keys
 * Tests both gemini_api_key and gemini_api_key2 to ensure they're working
 */

require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get API keys with fallback
function getGeminiApiKey() {
  return (
    process.env.gemini_api_key || 
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1 ||
    null
  );
}

function getGeminiApiKey2() {
  return (
    process.env.gemini_api_key2 || 
    process.env.GEMINI_API_KEY2 ||
    process.env['GEMINI_API-KEY2'] ||
    process.env['gemini_api-key2'] ||
    null
  );
}

async function listAvailableModels(apiKey) {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const models = await genAI.models.list();
    return models || [];
  } catch (error) {
    return [];
  }
}

async function testGeminiAPI(apiKey, keyName) {
  try {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Testing ${keyName}...`, 'bright');
    log(`${'='.repeat(60)}`, 'cyan');
    
    if (!apiKey) {
      log(`❌ ${keyName} is not configured`, 'red');
      return { success: false, error: 'API key not found' };
    }

    log(`✓ API Key found: ${apiKey.substring(0, 20)}...`, 'green');
    
    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey });
    
    // Try different model names (prioritize newer models)
    const modelNames = [
      'gemini-2.5-flash-lite',  // Recommended for speed/cost
      'gemini-2.5-flash',       // Balance
      'gemini-2.5-pro',         // Power/reasoning
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    
    let modelName = null;
    
    // Try to find a working model
    for (const name of modelNames) {
      try {
        // Test if model is accessible by making a simple call
        const testResult = await genAI.models.generateContent({
          model: name,
          contents: 'test'
        });
        if (testResult.text) {
          modelName = name;
          break;
        }
      } catch (err) {
        // Try next model
        continue;
      }
    }
    
    if (!modelName) {
      // Fallback to gemini-2.5-flash-lite
      modelName = 'gemini-2.5-flash-lite';
    }
    
    log(`✓ Model initialized: ${modelName}`, 'green');
    
    // Test prompt
    const testPrompt = 'Say "Hello, Gemini API is working!" in exactly 5 words.';
    log(`\n📝 Test Prompt: "${testPrompt}"`, 'blue');
    
    log(`⏳ Sending request to Gemini API...`, 'yellow');
    const startTime = Date.now();
    
    // Generate content
    const result = await genAI.models.generateContent({
      model: modelName,
      contents: testPrompt
    });
    const text = result.text || '';
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!text) {
      log(`❌ API returned empty response`, 'red');
      return { success: false, error: 'Empty response' };
    }
    
    log(`\n✅ SUCCESS!`, 'green');
    log(`📤 Response: "${text.trim()}"`, 'green');
    log(`⏱️  Response time: ${duration}ms`, 'cyan');
    
    // Test with a more complex prompt
    log(`\n📝 Testing complex prompt...`, 'blue');
    const complexPrompt = 'What is 2+2? Answer in one word.';
    const complexResult = await genAI.models.generateContent({
      model: modelName,
      contents: complexPrompt
    });
    const complexText = complexResult.text || '';
    
    log(`📤 Complex response: "${complexText.trim()}"`, 'green');
    
    return {
      success: true,
      response: text.trim(),
      duration,
      keyName
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`\n❌ ERROR: ${errorMessage}`, 'red');
    
    // Check for specific error types
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
      log(`   → Invalid API key`, 'red');
    } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      log(`   → API quota exceeded`, 'red');
    } else if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
      log(`   → Service temporarily unavailable`, 'red');
    }
    
    return {
      success: false,
      error: errorMessage,
      keyName
    };
  }
}

async function main() {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`🧪 Gemini API Keys Test Script`, 'bright');
  log(`${'='.repeat(60)}`, 'bright');
  
  const apiKey1 = getGeminiApiKey();
  const apiKey2 = getGeminiApiKey2();
  
  log(`\n📋 Configuration:`, 'cyan');
  log(`   Primary Key (gemini_api_key): ${apiKey1 ? '✓ Found' : '✗ Not found'}`, apiKey1 ? 'green' : 'red');
  log(`   Fallback Key (gemini_api_key2): ${apiKey2 ? '✓ Found' : '✗ Not found'}`, apiKey2 ? 'green' : 'red');
  
  if (!apiKey1 && !apiKey2) {
    log(`\n❌ No Gemini API keys found!`, 'red');
    log(`   Please set gemini_api_key or gemini_api_key2 in .env.local`, 'yellow');
    process.exit(1);
  }
  
  const results = [];
  
  // Test primary key
  if (apiKey1) {
    const result1 = await testGeminiAPI(apiKey1, 'gemini_api_key (Primary)');
    results.push(result1);
  }
  
  // Test fallback key
  if (apiKey2) {
    const result2 = await testGeminiAPI(apiKey2, 'gemini_api_key2 (Fallback)');
    results.push(result2);
  }
  
  // Summary
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📊 Test Summary`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  log(`\n✅ Successful: ${successful.length}/${results.length}`, successful.length > 0 ? 'green' : 'red');
  log(`❌ Failed: ${failed.length}/${results.length}`, failed.length > 0 ? 'red' : 'green');
  
  if (successful.length > 0) {
    log(`\n✓ Working API Keys:`, 'green');
    successful.forEach(result => {
      log(`   • ${result.keyName} (${result.duration}ms)`, 'green');
    });
  }
  
  if (failed.length > 0) {
    log(`\n✗ Failed API Keys:`, 'red');
    failed.forEach(result => {
      log(`   • ${result.keyName}: ${result.error}`, 'red');
    });
  }
  
  // Recommendations
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`💡 Recommendations`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  
  if (successful.length === 0) {
    log(`\n⚠️  No working API keys found!`, 'red');
    log(`   • Check your API keys in .env.local`, 'yellow');
    log(`   • Verify keys are valid at https://aistudio.google.com/`, 'yellow');
    log(`   • Ensure keys have proper permissions`, 'yellow');
  } else if (successful.length === 1 && failed.length === 1) {
    log(`\n⚠️  Only one API key is working`, 'yellow');
    log(`   • Consider fixing the failed key for redundancy`, 'yellow');
  } else if (successful.length === 2) {
    log(`\n✅ Both API keys are working perfectly!`, 'green');
    log(`   • Your app will automatically use fallback if primary fails`, 'green');
  }
  
  log(`\n`);
  
  // Exit with appropriate code
  process.exit(successful.length > 0 ? 0 : 1);
}

// Run the test
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

