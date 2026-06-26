import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function check() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is missing');
        return;
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const email = 'jhasaurabh1907@gmail.com';
    const userIdStr = '6a3d5d3f0f7b43efb5fd74c8';
    
    // Check user by ID and email
    const userCol = mongoose.connection.db.collection('users');
    const userByEmail = await userCol.findOne({ email });
    const userById = await userCol.findOne({ _id: new mongoose.Types.ObjectId(userIdStr) });

    console.log('\n=== USER BY EMAIL ===');
    console.log(userByEmail ? {
        _id: userByEmail._id,
        email: userByEmail.email,
        currentPlanKey: userByEmail.currentPlanKey,
        subscription: userByEmail.subscription,
        createdAt: userByEmail.createdAt
    } : 'Not found');

    console.log('\n=== USER BY ID ===');
    console.log(userById ? {
        _id: userById._id,
        email: userById.email,
        currentPlanKey: userById.currentPlanKey,
        subscription: userById.subscription,
        createdAt: userById.createdAt
    } : 'Not found');

    // Check webhook logs
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== COLLECTION COUNTS ===');
    for (const coll of collections) {
        const count = await mongoose.connection.db.collection(coll.name).countDocuments();
        console.log(`- ${coll.name}: ${count}`);
    }

    const webhookLogCol = mongoose.connection.db.collection('webhooklogs');
    const allLogsCount = await webhookLogCol.countDocuments();
    console.log(`Total webhook logs: ${allLogsCount}`);

    // Search for email anywhere in payload in webhooklogs
    const matchingLogs = await webhookLogCol.find({
        $or: [
            { "payload.customer.email": email },
            { "payload.email": email },
            { "payload.customer_details.email": email },
            { "payload.customer_email": email }
        ]
    }).toArray();

    console.log(`\n=== MATCHING WEBHOOK LOGS (${matchingLogs.length}) ===`);
    for (const log of matchingLogs) {
        console.log(`ID: ${log._id} | Provider: ${log.provider} | Type: ${log.eventType} | Status: ${log.status} | CreatedAt: ${log.createdAt}`);
        if (log.status === 'failed' || log.errorMessage) {
            console.log(`  Error: ${log.errorMessage}`);
        }
        console.log(`  Payload:`, JSON.stringify(log.payload).substring(0, 1000));
    }

    // If no matching logs found, let's log the last 10 webhook logs of any provider
    if (matchingLogs.length === 0) {
        const recentAnyLogs = await webhookLogCol.find({}).sort({ createdAt: -1 }).limit(10).toArray();
        console.log('\n=== RECENT WEBHOOK LOGS (ANY) ===');
        for (const log of recentAnyLogs) {
            console.log(`ID: ${log._id} | Provider: ${log.provider} | Type: ${log.eventType} | Status: ${log.status} | CreatedAt: ${log.createdAt}`);
            if (log.errorMessage) console.log(`  Error: ${log.errorMessage}`);
        }
    }

    // Check invoices for user
    const invoiceCol = mongoose.connection.db.collection('invoices');
    const invoices = await invoiceCol.find({ userId: new mongoose.Types.ObjectId(userIdStr) }).toArray();
    console.log('\n=== INVOICES FOR USER ===');
    console.log(invoices);

    const allInvoices = await invoiceCol.find({}).toArray();
    console.log('\n=== ALL INVOICES IN DB ===');
    console.log(allInvoices);

    // Check activity logs
    const activityLogCol = mongoose.connection.db.collection('activitylogs');
    const userLogs = await activityLogCol.find({
        $or: [
            { userId: new mongoose.Types.ObjectId(userIdStr) },
            { userId: userIdStr },
            { email: email },
            { description: { $regex: email, $options: 'i' } }
        ]
    }).sort({ createdAt: -1 }).toArray();
    console.log('\n=== USER ACTIVITY LOGS ===');
    console.log(userLogs.map(l => ({
        action: l.action,
        description: l.description,
        metadata: l.metadata,
        createdAt: l.createdAt
    })));

    await mongoose.connection.close();
}

check();
