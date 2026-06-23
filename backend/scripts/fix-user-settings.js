// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Load environment variables
// dotenv.config({ path: path.join(__dirname, '../.env') });

// import User from '../models/User.js';
// import UserSettings from '../models/UserSettings.js';

// async function fixUserSettings() {
//   try {
//     console.log('🔧 Starting UserSettings migration...');
    
//     // Connect to MongoDB
//     const mongoUri = process.env.MONGODB_URI;
//     if (!mongoUri) {
//       console.error('❌ MONGODB_URI is not set in environment variables');
//       process.exit(1);
//     }
//     console.log('📡 Connecting to MongoDB...');
//     await mongoose.connect(mongoUri, {
//       serverSelectionTimeoutMS: 20000,
//       socketTimeoutMS: 45000,
//     });
//     console.log('✅ Connected to MongoDB');

//     // Find all users without userSettingsId
//     const usersWithoutSettings = await User.find({ 
//       $or: [
//         { userSettingsId: { $exists: false } },
//         { userSettingsId: null }
//       ]
//     });

//     console.log(`📊 Found ${usersWithoutSettings.length} users without UserSettings`);

//     if (usersWithoutSettings.length === 0) {
//       console.log('✅ All users already have UserSettings');
//       await mongoose.disconnect();
//       return;
//     }

//     let fixed = 0;
//     let errors = 0;

//     for (const user of usersWithoutSettings) {
//       try {
//         console.log(`\n👤 Processing user: ${user.email} (${user.name}) - Role: ${user.role}`);
        
//         // Determine ownerType based on user's role
//         let ownerType = 'client'; // default
//         if (user.role === 'admin') {
//           ownerType = 'admin';
//         } else if (user.role === 'complex_owner' || user.role === 'manager') {
//           ownerType = 'complex_owner';
//         } else if (user.role === 'zimmer_owner') {
//           ownerType = 'zimmer_owner';
//         }

//         const userSettingsData = {
//           ownerType: ownerType,
//           numberOfComplexes: (ownerType === 'complex_owner' || ownerType === 'admin') ? 1 : 0
//         };

//         // Create UserSettings
//         const userSettings = new UserSettings(userSettingsData);
//         await userSettings.save();
//         console.log(`  ✅ Created UserSettings with ownerType: ${ownerType}`);

//         // Update user with userSettingsId
//         user.userSettingsId = userSettings._id;
//         await user.save();
//         console.log(`  ✅ Updated user with userSettingsId: ${userSettings._id}`);
        
//         fixed++;
//       } catch (error) {
//         console.error(`  ❌ Error processing user ${user.email}:`, error.message);
//         errors++;
//       }
//     }

//     console.log(`\n📊 Migration Summary:`);
//     console.log(`  ✅ Fixed: ${fixed} users`);
//     console.log(`  ❌ Errors: ${errors} users`);
//     console.log(`\n✅ Migration completed!`);

//     await mongoose.disconnect();
//     console.log('📡 Disconnected from MongoDB');
//   } catch (error) {
//     console.error('❌ Migration failed:', error);
//     process.exit(1);
//   }
// }

// // Run the migration
// fixUserSettings();
