import unitRepository from '../5-repositories/unitRepository.js';
import accountRepository from '../5-repositories/accountRepository.js';
import userRepository from '../5-repositories/userRepository.js';
import userSettingsRepository from '../5-repositories/userSettingsRepository.js';

export class UnitService {
  async getAllUnits(user) {
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
      console.log('⚠️ [UnitService] UserSettings not found, using role as fallback');
      if (user.role === 'admin') {
        ownerType = 'admin';
      } else if (user.role === 'zimmer_owner') {
        ownerType = 'zimmer_owner';
      } else if (user.role === 'complex_owner' || user.role === 'manager') {
        ownerType = 'complex_owner';
      } else {
        // No access
        return [];
      }
    }

    let query = {};
    
    // Filter based on ownerType
    if (ownerType === 'admin') {
      // admin sees all
      return (await unitRepository.findAll(query)).map(u => u.toJSON());
    } else if (ownerType === 'zimmer_owner') {
      // zimmer_owner sees their units (linked to user)
      query.linkType = 'user';
      query.linkedToId = user._id;
    } else if (ownerType === 'complex_owner') {
      // complex_owner sees all units linked to their accounts
      // Find all accounts linked to this user
      const userAccounts = await accountRepository.findAll({ userId: user._id });
      if (userAccounts.length === 0) {
        return [];
      }
      
      // Get all units linked to any of the user's accounts
      const accountIds = userAccounts.map(acc => acc._id);
      query.linkType = 'account';
      query.linkedToId = { $in: accountIds };
      console.log('🏠 [UnitService] Complex owner - found', userAccounts.length, 'accounts, query:', JSON.stringify(query));
    } else {
      // client/customer - no access
      return [];
    }

    const units = await unitRepository.findAll(query);
    console.log('🏠 [UnitService] Found units:', units.length);
    return units.map(u => u.toJSON());
  }

  async getUnitById(id, user) {
    const unit = await unitRepository.findById(id);
    
    if (!unit) {
      throw new Error('Unit not found');
    }

    // Check access - determine ownerType
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
      } else if (user.role === 'zimmer_owner') {
        ownerType = 'zimmer_owner';
      } else if (user.role === 'complex_owner' || user.role === 'manager') {
        ownerType = 'complex_owner';
      }
    }

    if (ownerType === 'admin') {
      return unit.toJSON();
    }
    
    if (ownerType === 'zimmer_owner' && unit.linkType === 'user' && unit.linkedToId?.toString() === user._id?.toString()) {
      return unit.toJSON();
    }
    
    if (ownerType === 'complex_owner') {
      // Check if unit is linked to one of user's accounts
      const userAccounts = await accountRepository.findAll({ userId: user._id });
      const userAccountIds = userAccounts.map(acc => acc._id.toString());
      if (unit.linkType === 'account' && unit.linkedToId && userAccountIds.includes(unit.linkedToId.toString())) {
        return unit.toJSON();
      }
    }

    throw new Error('Access denied');
  }

  async createUnit(unitData, user) {
    const data = {
      ...unitData
    };

    // Determine linkType and linkedToId based on unitData or user role
    if (!data.linkType) {
      // Auto-determine based on user role and data
      if (data.linkedToId) {
        // linkedToId is provided - determine linkType from it
        // Check if it's an account ID or user ID
        const account = await accountRepository.findById(data.linkedToId);
        if (account) {
          data.linkType = 'account';
        } else {
          // Assume it's a user ID
          data.linkType = 'user';
        }
      } else if (data.accountId) {
        // accountId provided (for backward compatibility)
        data.linkType = 'account';
        data.linkedToId = data.accountId;
      } else if (user.role === 'complex_owner' || user.role === 'manager') {
        // complex_owner/manager - find their first account
        const userAccounts = await accountRepository.findAll({ userId: user._id });
        if (userAccounts.length > 0) {
          data.linkType = 'account';
          data.linkedToId = userAccounts[0]._id;
        } else {
          throw new Error('אין לך מתחם משויך. אנא צור מתחם תחילה.');
        }
      } else {
        // zimmer_owner or other - link to user
        data.linkType = 'user';
        data.linkedToId = user._id;
      }
    }
    
    // Ensure linkedToId is set if linkType is set
    if (data.linkType && !data.linkedToId) {
      if (data.linkType === 'user') {
        data.linkedToId = user._id;
      } else if (data.linkType === 'account') {
        // Find user's first account
        const userAccounts = await accountRepository.findAll({ userId: user._id });
        if (userAccounts.length > 0) {
          data.linkedToId = userAccounts[0]._id;
        } else {
          throw new Error('אין לך מתחם משויך. אנא צור מתחם תחילה.');
        }
      }
    }

    // Validate based on Settings - כל יצירת צימר חייב לבדוק עם ה-SETTING
    if (data.linkType === 'user') {
      // Unit is linked to a user - check Settings
      const targetUser = await userRepository.findById(data.linkedToId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Get user's UserSettings - בדיקת מכסה רק אם קיים
      const userSettings = targetUser.userSettingsId
        ? await userSettingsRepository.findById(targetUser.userSettingsId)
        : null;

      // If ownerType is 'zimmer_owner', check that user can only have 1 unit
      const ownerType = userSettings?.ownerType || targetUser.role;
      if (ownerType === 'zimmer_owner') {
        const existingUnits = await unitRepository.findAll({ 
          linkType: 'user',
          linkedToId: data.linkedToId 
        });
        if (existingUnits.length >= 1) {
          throw new Error('בעל צימר יכול להגדיר צימר אחד בלבד!');
        }
      }
    } else if (data.linkType === 'account') {
      // Unit is linked to an account - check Settings and account quota
      const account = await accountRepository.findById(data.linkedToId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Check quota for the account - כמה צימרים מאופשרים במתחם
      // Note: numberOfComplexes check is done in createAccount, not here
      const unitsInAccount = await unitRepository.findAll({ 
        linkType: 'account',
        linkedToId: data.linkedToId 
      });
      if (unitsInAccount.length >= account.maxUnits) {
        throw new Error(`המכסה הושלמה! יש ${unitsInAccount.length} צימרים מתוך ${account.maxUnits} מותרים במתחם זה.`);
      }
    }

    const unit = await unitRepository.create(data);
    return unit.toJSON();
  }

  async updateUnit(id, unitData, user) {
    const unit = await unitRepository.findById(id);
    
    if (!unit) {
      throw new Error('Unit not found');
    }

    // Check access
    if (user.role === 'admin') {
      // admin can update
    } else if (user.role === 'zimmer_owner' && unit.linkType === 'user' && unit.linkedToId?.toString() !== user._id?.toString()) {
      throw new Error('Access denied');
    } else if (user.role === 'complex_owner' || user.role === 'manager') {
      // Convert both to string for comparison
      const unitAccountId = unit.linkType === 'account' ? (unit.linkedToId?.toString ? unit.linkedToId.toString() : unit.linkedToId) : null;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      if (unitAccountId !== userAccountId) {
        throw new Error('Access denied');
      }
    }

    const updatedUnit = await unitRepository.update(id, unitData);
    return updatedUnit.toJSON();
  }

  async deleteUnit(id, user) {
    const unit = await unitRepository.findById(id);
    
    if (!unit) {
      throw new Error('Unit not found');
    }

    // Check access
    if (user.role === 'admin') {
      // admin can delete
    } else if (user.role === 'zimmer_owner' && unit.linkType === 'user' && unit.linkedToId?.toString() !== user._id?.toString()) {
      throw new Error('Access denied');
    } else if (user.role === 'complex_owner' || user.role === 'manager') {
      // Convert both to string for comparison
      const unitAccountId = unit.linkType === 'account' ? (unit.linkedToId?.toString ? unit.linkedToId.toString() : unit.linkedToId) : null;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      if (unitAccountId !== userAccountId) {
        throw new Error('Access denied');
      }
    }

    await unitRepository.delete(id);
    return { message: 'Unit deleted successfully' };
  }
}

export default new UnitService();
