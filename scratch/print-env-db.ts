import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('MONGODB_URI:', process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@') : 'missing');
