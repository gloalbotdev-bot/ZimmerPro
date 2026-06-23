
// getting-started.js
import mongoose from "mongoose";

async function connect() {
  try {
    const connectionString = process.env.MONGODB_URI;
    if (!connectionString) {
      throw new Error('MONGODB_URI is not set in environment variables (.env file)');
    }

    console.log('🔌 Connecting to MongoDB...');
    const maskedUri = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`📍 Connection String: ${maskedUri}`);

    mongoose.set('strictQuery', false);

    
    // Connect with timeout and better error handling
    await mongoose.connect(connectionString, {
    
     });

    
    console.log(' MongoDB Connected successfully');
    console.log(` Database: ${mongoose.connection.name}`);
    console.log(` Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    console.log(` Host: ${mongoose.connection.host}`);
  } catch (error) {
 
    
    if (error.message.includes('IP') || error.message.includes('whitelist') || error.message.includes('network')) {
      console.error('');
      console.error('💡 IP Whitelist Issue Detected!');
      console.error('   Please check MongoDB Atlas Network Access:');
      console.error('   1. Go to: https://cloud.mongodb.com');
      console.error('   2. Select your cluster');
      console.error('   3. Click "Network Access"');
      console.error('   4. Click "Add IP Address"');
      console.error('   5. Add "0.0.0.0/0" (allow all IPs) OR add your current IP');
      console.error('');
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.error('');
      console.error('💡 Authentication Issue Detected!');
      console.error('   Please check MongoDB Atlas Database Access:');
      console.error('   1. Go to: https://cloud.mongodb.com');
      console.error('   2. Select your cluster');
      console.error('   3. Click "Database Access"');
      console.error('   4. Verify the database user and password in MONGODB_URI are correct');
      console.error('');
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('');
      console.error('💡 SSL/TLS Issue Detected!');
      console.error('   Please check MongoDB Atlas connection settings');
      console.error('');
    } else {
      console.error('');
      console.error('💡 General Connection Issue');
      console.error('   Full error details:');
      console.error(error);
      console.error('');
    }
    throw error;
  }
}

// Clean up old indexes that are no longer needed
async function cleanupOldIndexes() {
  try {
    const Account = (await import('../models/Account.js')).default;
    const indexes = await Account.collection.indexes();
    console.log('📋 [DB] Current indexes on accounts collection:', indexes.map(idx => idx.name));
    
    // Check if token_1 index exists and drop it
    const tokenIndex = indexes.find(idx => idx.name === 'token_1');
    if (tokenIndex) {
      console.log('🧹 [DB] Found old token_1 index, dropping it...');
      await Account.collection.dropIndex('token_1');
      console.log('✅ [DB] Successfully dropped token_1 index');
    } else {
      console.log('✅ [DB] No token_1 index found (already cleaned up)');
    }
    
    // Also check for accountNumber index if it exists
    const accountNumberIndex = indexes.find(idx => idx.name === 'accountNumber_1');
    if (accountNumberIndex) {
      console.log('🧹 [DB] Found old accountNumber_1 index, dropping it...');
      await Account.collection.dropIndex('accountNumber_1');
      console.log('✅ [DB] Successfully dropped accountNumber_1 index');
    }
  } catch (error) {
    // If index doesn't exist, that's fine - just log it
    if (error.code === 27 || error.message?.includes('index not found')) {
      console.log('ℹ️  [DB] Index already removed or never existed');
    } else {
      console.warn('⚠️  [DB] Error cleaning up old indexes:', error.message);
    }
  }
}

// Handle connection events
mongoose.connection.on('connected', async () => {
  console.log('✅ MongoDB connection established');
  // Clean up old indexes after connection is established
  await cleanupOldIndexes();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

// Disable mongoose buffering - fail fast if not connected
mongoose.set('bufferCommands', false);

export default connect;
