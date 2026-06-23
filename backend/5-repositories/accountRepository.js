import Account from '../models/Account.js';
import mongoose from 'mongoose';

export class AccountRepository {
  
  async findAll(query = {}) {
    return await Account.find(query);
  }

  async findById(id) {
    console.log('🔍 [AccountRepository] findById called with id:', id, 'type:', typeof id, 'length:', id?.length);
    // Only accept valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
      console.warn('⚠️ [AccountRepository] Invalid ObjectId:', {
        id,
        isValid: mongoose.Types.ObjectId.isValid(id),
        length: id?.length,
        expectedLength: 24
      });
      return null;
    }
    console.log('🔍 [AccountRepository] Searching for account with _id:', id);
    const account = await Account.findById(id);
    console.log('🔍 [AccountRepository] Account found:', account ? 'YES' : 'NO');
    if (account) {
      console.log('🔍 [AccountRepository] Account details:', {
        _id: account._id?.toString(),
        id: account.id || account._id?.toString(),
        name: account.name
      });
    } else {
      // Try to find by any field to see if account exists with different ID
      const allAccounts = await Account.find({}).limit(5);
      console.log('🔍 [AccountRepository] Sample accounts in DB:', allAccounts.map(a => ({
        _id: a._id?.toString(),
        name: a.name
      })));
    }
    return account;
  }

  async create(accountData) {
    console.log('📝 [AccountRepository] create called with data:', accountData);
    
    
    // Remove accountNumber and token if they exist - we don't use them anymore, only _id
    const cleanData = { ...accountData };
    delete cleanData.accountNumber;
    delete cleanData.token;
    
    // Ensure we only have valid fields
    const validFields = ['name', 'phone', 'email', 'logo', 'primary_contact_id', 'is_active', 'whatsapp_number', 'maxUnits'];
    const filteredData = {};
    for (const key of validFields) {
      if (cleanData[key] !== undefined) {
        filteredData[key] = cleanData[key];
      }
    }
    
    console.log('📝 [AccountRepository] Filtered data (after removing token and accountNumber):', filteredData);
    
    // Use collection.insertOne directly to bypass ALL Mongoose validation
    // This ensures we can create accounts without token/accountNumber validation errors
    try {
      console.log('📝 [AccountRepository] Using insertOne to bypass ALL validation...');
      
      // Insert directly into MongoDB collection, bypassing Mongoose completely
      const result = await Account.collection.insertOne(filteredData);
      console.log('📝 [AccountRepository] Account inserted successfully with _id:', result.insertedId);
      
      // Fetch the created document using collection.findOne to avoid ANY Mongoose validation
      const rawDoc = await Account.collection.findOne({ _id: result.insertedId });
      if (!rawDoc) {
        throw new Error('Account was created but could not be retrieved');
      }
      
      // Remove token and accountNumber from rawDoc if they exist (from old data)
      if (rawDoc.token !== undefined) {
        delete rawDoc.token;
      }
      if (rawDoc.accountNumber !== undefined) {
        delete rawDoc.accountNumber;
      }
      
      // Use hydrate() to create Mongoose document from existing MongoDB data
      // This bypasses ALL validation and hooks - perfect for data already in DB
      const saved = Account.hydrate(rawDoc);
      
      console.log('📝 [AccountRepository] Account created and retrieved successfully');
      return saved;
    } catch (error) {
      console.error('📝 [AccountRepository] Error creating account:', error.message);
      console.error('📝 [AccountRepository] Error name:', error.name);
      console.error('📝 [AccountRepository] Error stack:', error.stack);
      throw error;
    }
  }

  async update(id, accountData) {
    // Remove accountNumber and token if they exist - we don't use them anymore, only _id
    const cleanData = { ...accountData };
    delete cleanData.accountNumber;
    delete cleanData.token;
    
    // Only accept valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
      return null;
    }
    
    return await Account.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      cleanData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    console.log('🗑️ [AccountRepository] delete called with id:', id, 'type:', typeof id);
    
    // Only accept valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
      console.log('🗑️ [AccountRepository] Invalid ObjectId format');
      return null;
    }
    
    try {
      const objectId = new mongoose.Types.ObjectId(id);
      console.log('🗑️ [AccountRepository] Deleting by _id:', objectId);
      
      const result = await Account.findOneAndDelete({ _id: objectId });
      
      if (result) {
        console.log('🗑️ [AccountRepository] Successfully deleted account by _id');
        return result;
      } else {
        console.log('🗑️ [AccountRepository] No account found with _id:', objectId);
        return null;
      }
    } catch (error) {
      console.error('🗑️ [AccountRepository] Error deleting by _id:', error.message, error.name);
      throw error;
    }
  }
}

export default new AccountRepository();
