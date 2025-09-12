const crypto = require('crypto');

console.log('🔐 Generating NextAuth Secret...');

// Generate a secure random secret
const secret = crypto.randomBytes(32).toString('hex');

console.log('✅ Generated NextAuth Secret:');
console.log(secret);
console.log('');
console.log('📝 Add this to your .env.local file:');
console.log(`NEXTAUTH_SECRET=${secret}`);
console.log('');
console.log('📝 Or add it to your Vercel environment variables:');
console.log(`NEXTAUTH_SECRET = ${secret}`);
console.log('');
console.log('⚠️  Keep this secret secure and never commit it to version control!');
