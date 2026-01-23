const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Minimal User Schema to match existing collection
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    authProvider: { type: String, default: 'nextauth' },
    // specific required fields based on the model definition
    authProviderId: { type: String },
    password: { type: String },
}, { strict: false }); // strict: false allows us to update without defining the full schema

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function fixAdminUser() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const email = 'amarl@cvcircle.io';

        let user = await User.findOne({ email });

        if (user) {
            console.log(`Found user: ${user.email} (Current Role: ${user.role})`);
            user.role = 'admin';
            await user.save();
            console.log('✅ Updated user role to admin');
        } else {
            console.log(`User ${email} not found. Creating...`);
            user = new User({
                email,
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                authProvider: 'nextauth',
                authProviderId: 'admin_manual_' + Date.now(),
                usage: {
                    cvJourneyCount: 0,
                    cvCreatedCount: 0,
                    journeysCreated: 0,
                    exportCount: 0,
                    atsCheckCount: 0,
                    lastResetDate: new Date()
                },
                settings: {
                    theme: 'dark',
                    notifications: { email: true, push: true },
                    timezone: 'UTC',
                    languagePreference: 'en'
                },
                subscription: {
                    planKey: 'free',
                    status: 'active',
                    startDate: new Date(),
                    provider: 'admin',
                    interval: 'monthly',
                    seats: 3,
                    storageUsed: 0
                }
            });
            await user.save();
            console.log('✅ Created new admin user');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected');
    }
}

fixAdminUser();
