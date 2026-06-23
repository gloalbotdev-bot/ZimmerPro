import userRepository from '../5-repositories/userRepository.js';
import userSettingsRepository from '../5-repositories/userSettingsRepository.js';

export class UserService {
  async getAllUsers(user) {
    let query = {};
    
    // Filter based on role
    if (user.role === 'admin') {
      // Admin sees all users
      query = {};
    } else if (user.role === 'complex_owner' || user.role === 'manager') {
      // Complex owner/manager sees only users whose accounts are linked to them
      // Need to find accounts with userId = user._id, then find users linked to those accounts
      const accountRepository = (await import('../5-repositories/accountRepository.js')).default;
      const accounts = await accountRepository.findAll({ userId: user._id });
      const accountIds = accounts.map(a => a._id);
      // For now, complex_owner/manager sees only themselves (since Account → User relationship)
      query._id = user._id;
    } else if (user.role === 'zimmer_owner') {
      // Zimmer owner sees only themselves
      query._id = user._id;
    } else {
      // Other roles (client, customer) see only themselves
      query._id = user._id;
    }

    const users = await userRepository.findAll(query);
    // Load UserSettings for each user
    const usersWithSettings = await Promise.all(users.map(async (u) => {
      const userJson = u.toJSON();
      if (u.userSettingsId) {
        const userSettings = await userSettingsRepository.findById(u.userSettingsId);
        if (userSettings) {
          userJson.userSettings = userSettings.toJSON();
        }
      }
      return userJson;
    }));
    return usersWithSettings;
  }

  async getUserById(id, user) {
    const foundUser = await userRepository.findById(id);
    
    if (!foundUser) {
      throw new Error('User not found');
    }

    // Users can only see their own profile unless they're admin
    if (user.role !== 'admin' && user._id.toString() !== id) {
      throw new Error('Access denied');
    }

    const userJson = foundUser.toJSON();
    // Load UserSettings
    if (foundUser.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(foundUser.userSettingsId);
      if (userSettings) {
        userJson.userSettings = userSettings.toJSON();
      }
    }
    return userJson;
  }

  async createUser(userData, currentUser) {
    // Only admin can create users
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied');
    }

    // Create UserSettings first (required for every user)
    // Determine ownerType based on role or userData
    let ownerType = 'client'; // default for new users (client role)
    if (userData.role === 'admin') {
      ownerType = 'admin';
    } else if (userData.role === 'complex_owner' || userData.role === 'manager') {
      ownerType = 'complex_owner';
    } else if (userData.role === 'zimmer_owner') {
      ownerType = 'zimmer_owner';
    } else if (userData.ownerType) {
      ownerType = userData.ownerType; // Allow explicit setting
    }

    const userSettingsData = {
      ownerType: ownerType,
      numberOfComplexes: userData.numberOfComplexes || 0
    };

    const userSettings = await userSettingsRepository.create(userSettingsData);
    console.log('✅ [UserService] UserSettings created:', userSettings.id);

    // Add userSettingsId to userData
    userData.userSettingsId = userSettings._id;

    const newUser = await userRepository.create(userData);
    return newUser.toJSON();
  }

  async updateUser(id, userData, currentUser) {
    // Users can only update their own profile unless they're admin
    if (currentUser.role !== 'admin' && currentUser._id.toString() !== id) {
      throw new Error('Access denied');
    }

    // Get existing user to check for userSettingsId
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update UserSettings if ownerType or numberOfComplexes are provided
    if (userData.ownerType !== undefined || userData.numberOfComplexes !== undefined) {
      if (existingUser.userSettingsId) {
        // Update existing UserSettings
        const userSettingsUpdate = {};
        if (userData.ownerType !== undefined) {
          userSettingsUpdate.ownerType = userData.ownerType;
        }
        if (userData.numberOfComplexes !== undefined) {
          userSettingsUpdate.numberOfComplexes = userData.numberOfComplexes;
        }
        
        await userSettingsRepository.update(existingUser.userSettingsId, userSettingsUpdate);
        console.log('✅ [UserService] UserSettings updated:', existingUser.userSettingsId, userSettingsUpdate);
      } else {
        // Create new UserSettings if doesn't exist
        let ownerType = 'client'; // default for new users (client role)
        if (userData.role === 'admin') {
          ownerType = 'admin';
        } else if (userData.role === 'complex_owner' || userData.role === 'manager') {
          ownerType = 'complex_owner';
        } else if (userData.role === 'zimmer_owner') {
          ownerType = 'zimmer_owner';
        } else if (userData.ownerType) {
          ownerType = userData.ownerType;
        }

        const userSettingsData = {
          ownerType: ownerType,
          numberOfComplexes: userData.numberOfComplexes || 0
        };

        const newUserSettings = await userSettingsRepository.create(userSettingsData);
        console.log('✅ [UserService] UserSettings created:', newUserSettings.id);
        
        // Link UserSettings to User
        userData.userSettingsId = newUserSettings._id;
      }
    }

    // Remove ownerType and numberOfComplexes from userData (they're in UserSettings, not User)
    const { ownerType, numberOfComplexes, ...userDataWithoutSettings } = userData;

    const updatedUser = await userRepository.update(id, userDataWithoutSettings);
    
    if (!updatedUser) {
      throw new Error('User not found');
    }

    const userJson = updatedUser.toJSON();
    // Load UserSettings to return updated values
    if (updatedUser.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(updatedUser.userSettingsId);
      if (userSettings) {
        userJson.userSettings = userSettings.toJSON();
      }
    }
    return userJson;
  }

  async deleteUser(id, currentUser) {
    // Only admin can delete users
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied');
    }

    const deletedUser = await userRepository.delete(id);
    
    if (!deletedUser) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  }
}

export default new UserService();
