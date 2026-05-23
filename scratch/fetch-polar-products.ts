import { Polar } from '@polar-sh/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function tryServer(server: 'sandbox' | 'production') {
    console.log(`\n--- Trying Server: ${server} ---`);
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('POLAR_ACCESS_TOKEN is missing');
    }

    try {
        const polar = new Polar({
            accessToken,
            server
        });

        const response = await polar.products.list({
            limit: 100
        });

        console.log(`✅ Success for ${server}! Found ${response.items?.length || 0} products:`);
        if (response.items) {
            for (const item of response.items) {
                console.log(`\n- Product Name: ${item.name} (${item.id})`);
                console.log(`  Is recurring: ${item.isRecurring}`);
                if (item.prices) {
                    for (const price of item.prices) {
                        console.log(`  * Price ID: ${price.id} | Amount: ${(price as any).priceAmount / 100} ${(price as any).priceCurrency?.toUpperCase()}`);
                    }
                }
            }
        }
        return true;
    } catch (error: any) {
        console.log(`❌ Failed for ${server}:`, error.message || error);
        if (error.body) {
            console.log(`   Body:`, error.body);
        }
        return false;
    }
}

async function run() {
    await tryServer('production');
    await tryServer('sandbox');
}

run();
