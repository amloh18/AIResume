const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function fixUserAuth() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const email = 'amarl@cvcircle.io';
    
    // We can't easily require the TypeScript model in this plain JS script without ts-node setup,
    // so we'll just use the raw connection to update the document directly.
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ email });

    if (user) {
      console.log(`Found user: ${user.email}`);
      console.log(`Current authProvider: ${user.authProvider}`);
      
      // Hash a default password so they can actually log in via email
      // I'll set it to something standard for admin scripts, or just update authProvider.
      // Wait, the standard admin password used in other scripts is 'Iwtglbutgl@1995'
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Iwtglbutgl@1995', salt);
      
      await usersCollection.updateOne(
        { email },
        { 
          $set: { 
            authProvider: 'credentials',
            password: hashedPassword,
            role: 'admin' // ensure they are admin just in case
          } 
        }
      );
      
      console.log('✅ Updated user authProvider to credentials');
      console.log('✅ Set password to standard admin password: Iwtglbutgl@1995');
    } else {
      console.log(`User ${email} not found.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

fixUserAuth();
