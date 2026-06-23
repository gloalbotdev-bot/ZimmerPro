import accountRepository from '../5-repositories/accountRepository.js';
import userRepository from '../5-repositories/userRepository.js';
import userSettingsRepository from '../5-repositories/userSettingsRepository.js';

export class AccountService {
  async getAllAccounts(user) {
    console.log('🏢 [AccountService] getAllAccounts called');
    
    // בדיקת הרשאות לפי UserSettings (אם קיים) או role (fallback)
    let ownerType = null;
    
    const userDoc = await userRepository.findById(user._id);
    if (userDoc && userDoc.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(userDoc.userSettingsId);
      if (userSettings) {
        ownerType = userSettings.ownerType;
      }
    }
    
    // Fallback to role if UserSettings not found (for backward compatibility)
    if (!ownerType) {
      console.log('⚠️ [AccountService] UserSettings not found, using role as fallback');
      if (user.role === 'admin') {
        ownerType = 'admin';
      } else if (user.role === 'complex_owner') {
        ownerType = 'complex_owner';
      } else {
        // No access
        return [];
      }
    }
    
    // Admin sees all accounts
    if (ownerType === 'admin') {
      console.log('🏢 [AccountService] User is admin - fetching all accounts');
      const accounts = await accountRepository.findAll({});
      console.log('🏢 [AccountService] Found', accounts?.length || 0, 'accounts in DB');
      
      const result = accounts.map(a => {
        const json = a.toJSON();
        console.log('🏢 [AccountService] Account toJSON:', {
          id: json.id,
          name: json.name,
          email: json.email
        });
        return json;
      });
      
      console.log('🏢 [AccountService] Returning', result.length, 'accounts to client');
      return result;
    }
    
    // Complex owners see all their accounts (linked to them via userId)
    if (ownerType === 'complex_owner') {
      console.log('🏢 [AccountService] Complex owner - fetching all accounts linked to user');
      const accounts = await accountRepository.findAll({ userId: user._id });
      console.log('🏢 [AccountService] Found', accounts?.length || 0, 'accounts for complex owner');
      
      // Check if user can add more accounts based on numberOfComplexes (if UserSettings exists)
      if (userDoc && userDoc.userSettingsId) {
        const userSettings = await userSettingsRepository.findById(userDoc.userSettingsId);
        if (userSettings && userSettings.numberOfComplexes > 0 && accounts.length >= userSettings.numberOfComplexes) {
          console.log('🏢 [AccountService] Complex owner reached max accounts limit:', accounts.length, '/', userSettings.numberOfComplexes);
        }
      }
      
      return accounts.map(a => a.toJSON());
    }

    // Other users see nothing
    console.log('🏢 [AccountService] User is not admin or complex_owner - returning empty array');
    return [];
  }

  async getAccountById(id, user) {
    const account = await accountRepository.findById(id);
    
    if (!account) {
      throw new Error('Account not found');
    }

    // Check access - admin sees all, complex_owner sees their accounts
    const userDoc = await userRepository.findById(user._id);
    let ownerType = null;
    
    if (userDoc && userDoc.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(userDoc.userSettingsId);
      if (userSettings) {
        ownerType = userSettings.ownerType;
      }
    }
    
    // Fallback to role
    if (!ownerType) {
      if (user.role === 'admin') {
        ownerType = 'admin';
      } else if (user.role === 'complex_owner') {
        ownerType = 'complex_owner';
      }
    }
    
    if (ownerType === 'admin') {
      return account.toJSON();
    }
    
    if (ownerType === 'complex_owner' && account.userId?.toString() === user._id?.toString()) {
      return account.toJSON();
    }

    throw new Error('Access denied');
  }

  async createAccount(accountData, user) {
    console.log('📝 [AccountService] createAccount called with data:', accountData);
    
    // Check if user is admin or complex_owner
    // Use UserSettings if available, otherwise fallback to role
    let ownerType = null;
    const userDoc = await userRepository.findById(user._id);
    
    if (userDoc && userDoc.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(userDoc.userSettingsId);
      if (userSettings) {
        ownerType = userSettings.ownerType;
      }
    }
    
    // Fallback to role if UserSettings not found
    if (!ownerType) {
      console.log('⚠️ [AccountService] UserSettings not found, using role as fallback');
      if (user.role === 'admin') {
        ownerType = 'admin';
      } else if (user.role === 'complex_owner') {
        ownerType = 'complex_owner';
      } else {
        throw new Error('Access denied - רק אדמין או בעל מתחם יכולים ליצור מתחמים');
      }
    }

    // Only admin or complex_owner can create accounts
    if (ownerType !== 'admin' && ownerType !== 'complex_owner') {
      throw new Error('Access denied - רק אדמין או בעל מתחם יכולים ליצור מתחמים');
    }

    // שיוך ליוזר - אם זה complex_owner, הוא יוצר לעצמו
    // אם זה admin, הוא יכול ליצור למשתמש אחר
    if (!accountData.userId) {
      if (ownerType === 'complex_owner') {
        // בעל מתחם יוצר לעצמו
        accountData.userId = user._id;
      } else {
        // אדמין חייב לבחור יוזר
        throw new Error('חובה לבחור יוזר לשיוך למתחם');
      }
    }

    // מתחם מקושר ליוזר ולא הפוך - רק אם בהגדרות היוזר הוא בעל מתחם
    const accountUser = await userRepository.findById(accountData.userId);
    if (!accountUser) {
      throw new Error('User not found');
    }

    // Get accountUserSettings with fallback to role
    let accountUserOwnerType = null;
    let accountUserSettings = null;
    
    if (accountUser.userSettingsId) {
      accountUserSettings = await userSettingsRepository.findById(accountUser.userSettingsId);
      if (accountUserSettings) {
        accountUserOwnerType = accountUserSettings.ownerType;
      }
    }
    
    // Fallback to role if UserSettings not found
    if (!accountUserOwnerType) {
      console.log('⚠️ [AccountService] AccountUser UserSettings not found, using role as fallback');
      if (accountUser.role === 'admin') {
        accountUserOwnerType = 'admin';
      } else if (accountUser.role === 'complex_owner' || accountUser.role === 'manager') {
        accountUserOwnerType = 'complex_owner';
      } else {
        throw new Error('מתחם יכול להיות מקושר ליוזר רק אם בהגדרות המשתמש הוא בעל מתחם (complex_owner) או אדמין');
      }
    }

    // מתחם יכול להיות מקושר ליוזר רק אם בהגדרות המשתמש הוא בעל מתחם או אדמין
    if (accountUserOwnerType !== 'complex_owner' && accountUserOwnerType !== 'admin') {
      throw new Error('מתחם יכול להיות מקושר ליוזר רק אם בהגדרות המשתמש הוא בעל מתחם (complex_owner) או אדמין');
    }

    // Check number of complexes (accounts) for this user - כמה מתחמים מוגדרים
    // רק אם זה complex_owner (לא אדמין)
    if (accountUserOwnerType === 'complex_owner') {
      const userAccounts = await accountRepository.findAll({ userId: accountData.userId });
      
      // Get numberOfComplexes from UserSettings if available, otherwise allow unlimited
      const numberOfComplexes = accountUserSettings?.numberOfComplexes ?? 0;
      
      console.log('📝 [AccountService] Checking numberOfComplexes:', {
        userId: accountData.userId,
        existingAccounts: userAccounts.length,
        allowedComplexes: numberOfComplexes,
        canCreate: numberOfComplexes === 0 || userAccounts.length < numberOfComplexes
      });
      
      // Allow if numberOfComplexes is 0 (unlimited) OR if current count is less than allowed
      if (numberOfComplexes > 0 && userAccounts.length >= numberOfComplexes) {
        throw new Error(`מספר המתחמים הושלם! יש ${userAccounts.length} מתחמים מתוך ${numberOfComplexes} מותרים בהגדרות.`);
      }
    }

    // Remove token and accountNumber before sending to repository
    const cleanData = { ...accountData };
    // delete cleanData.token;
    // delete cleanData.accountNumber;
    
    console.log('📝 [AccountService] Cleaned data (removed token and accountNumber):', cleanData);
    
    try {
      const account = await accountRepository.create(cleanData);
      console.log('📝 [AccountService] Account created successfully');
      return account.toJSON();
    } catch (error) {
      console.error('📝 [AccountService] Error creating account:', error.message);
      console.error('📝 [AccountService] Error details:', error);
      throw error;
    }
  }

  async updateAccount(id, accountData, user) {
    // Check access
    if (user.role !== 'admin' && user.accountId?.toString() !== id) {
      throw new Error('Access denied');
    }

    const account = await accountRepository.update(id, accountData);
    
    if (!account) {
      throw new Error('Account not found');
    }

    return account.toJSON();
  }

  async deleteAccount(id, user) {
    console.log('🗑️ [AccountService] deleteAccount called with id:', id, 'type:', typeof id);
    
    // Only admin can delete accounts
    if (user.role !== 'admin') {
      throw new Error('Access denied');
    }

    try {
      const account = await accountRepository.delete(id);
      
      if (!account) {
        console.log('🗑️ [AccountService] Account not found for id:', id);
        throw new Error('Account not found');
      }

      console.log('🗑️ [AccountService] Account deleted successfully');
      return { message: 'Account deleted successfully' };
    } catch (error) {
      console.error('🗑️ [AccountService] Error deleting account:', error);
      throw error;
    }
  }
}

export default new AccountService();
