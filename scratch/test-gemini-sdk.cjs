const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Environment keys:');
console.log('gemini_api_key:', process.env.gemini_api_key ? 'FOUND' : 'MISSING');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');
console.log('gemini_api_key1:', process.env.gemini_api_key1 ? 'FOUND' : 'MISSING');
console.log('GEMINI_API_KEY1:', process.env.GEMINI_API_KEY1 ? 'FOUND' : 'MISSING');
console.log('NEXT_PUBLIC_GEMINI_API_KEY:', process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'FOUND' : 'MISSING');

const key =
  process.env.gemini_api_key ||
  process.env.GEMINI_API_KEY ||
  process.env.gemini_api_key1 ||
  process.env.GEMINI_API_KEY1 ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!key) {
  console.error('No Gemini API key found in process.env');
  process.exit(1);
}

const { GoogleGenAI } = require('@google/genai');

async function testSDK(model, passUndefinedConfig = false) {
  console.log(`\nTesting SDK with model: ${model} (passUndefinedConfig: ${passUndefinedConfig})`);
  try {
    const genAI = new GoogleGenAI({ apiKey: key });
    
    const config = {
      temperature: 0.7,
      maxOutputTokens: 2048,
    };
    
    if (passUndefinedConfig) {
      config.responseMimeType = undefined;
      config.responseSchema = undefined;
    }

    const result = await genAI.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: 'Hello, say "OK" in one word.' }] }],
      config: config
    });
    console.log(`Success: "${result.text ? result.text.trim() : ''}"`);
  } catch (err) {
    console.error(`Failed:`, err.message);
  }
}

async function run() {
  await testSDK('gemini-2.5-flash', false);
  await testSDK('gemini-2.5-flash-lite', false);
}

run();
