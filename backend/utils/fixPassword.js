import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../5-repositories/db.js';
import User from '../models/User.js';

async function fixPasswords() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    // Find all users with unhashed passwords (passwords that don't start with $2a$ or $2b$)
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users`);

    let fixedCount = 0;
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        console.log(`🔧 Fixing password for user: ${user.email}`);
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Update password directly in database (bypassing the pre-save hook)
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        fixedCount++;
        console.log(`✅ Fixed password for ${user.email}`);
      } else {
        console.log(`✓ Password already hashed for ${user.email}`);
      }
    }

    console.log(`\n✨ Fixed ${fixedCount} passwords`);
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPasswords();
