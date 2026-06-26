/**
 * Creates a temporary dev admin user for email+password login (no OTP).
 *
 * Usage:
 *   cd backend && npm run create-dev-user
 *
 * Optional env overrides in backend/.env:
 *   DEV_USER_EMAIL=admin@zimmerpro.local
 *   DEV_USER_PASSWORD=DevAdmin123!
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../5-repositories/db.js';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const DEV_EMAIL = process.env.DEV_USER_EMAIL || 'admin@zimmerpro';
const DEV_PASSWORD = process.env.DEV_USER_PASSWORD || 'admin123';
const DEV_NAME = process.env.DEV_USER_NAME || 'Dev Admin';

async function createDevUser() {
  try {
    await connectDB();

    let user = await User.findOne({ email: DEV_EMAIL.toLowerCase() });

    if (user) {
      user.password = DEV_PASSWORD;
      user.isApproved = true;
      user.isActive = true;
      user.role = 'admin';
      await user.save();
      console.log('✅ Existing user updated (password reset, admin + approved)');
    } else {
      const userSettings = await UserSettings.create({
        ownerType: 'admin',
        numberOfComplexes: 0,
      });

      user = await User.create({
        name: DEV_NAME,
        email: DEV_EMAIL.toLowerCase(),
        password: DEV_PASSWORD,
        phoneNumber: '0500000000',
        role: 'admin',
        userSettingsId: userSettings._id,
        isApproved: true,
        isActive: true,
      });

      console.log('✅ Dev user created');
    }

    console.log('');
    console.log('════════════════════════════════════════');
    console.log('  התחברות בממשק — טאב "אימייל"');
    console.log('════════════════════════════════════════');
    console.log(`  אימייל:   ${DEV_EMAIL}`);
    console.log(`  סיסמה:    ${DEV_PASSWORD}`);
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('⚠️  משתמש זמני לפיתוח בלבד — אל תשתמש בפרודקשן');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create dev user:', error.message);
    process.exit(1);
  }
}

createDevUser();
