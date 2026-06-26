import { Polar } from '@polar-sh/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function checkPolar() {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const mode = process.env.POLAR_MODE || 'production';
    console.log('POLAR_ACCESS_TOKEN exists:', !!accessToken);
    console.log('POLAR_WEBHOOK_SECRET exists:', !!process.env.POLAR_WEBHOOK_SECRET);
    console.log('POLAR_MODE:', mode);

    if (!accessToken) {
        console.error('No Polar Access Token found');
        return;
    }

    console.log('Token prefix:', accessToken.substring(0, 15));

    try {
        const polar = new Polar({
            accessToken: accessToken,
            server: 'production'
        });

        // Try listing organizations
        console.log('\n--- Listing Organizations ---');
        const orgs = await polar.organizations.list({});
        console.log(`Organizations found: ${orgs?.items?.length || 0}`);
        for (const org of orgs?.items || []) {
            console.log(`Org ID: ${org.id} | Name: ${org.name} | Slug: ${org.slug}`);
        }

        // List products first to verify connection and authentication
        const products = await polar.products.list({});
        console.log(`\n=== PRODUCTS (${products?.items?.length || 0}) ===`);
        for (const prod of products?.items || []) {
            console.log(`Product ID: ${prod.id} | Name: ${prod.name}`);
        }
    } catch (err) {
        console.error('Error fetching info:', err);
    }
}

checkPolar();
