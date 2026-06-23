import UserSettings from '../models/UserSettings.js';

export class UserSettingsRepository {
  async findAll(query = {}) {
    return await UserSettings.find(query);
  }

  async findById(id) {
    return await UserSettings.findById(id);
  }

  async create(userSettingsData) {
    const userSettings = new UserSettings(userSettingsData);
    return await userSettings.save();
  }

  async update(id, userSettingsData) {
    return await UserSettings.findByIdAndUpdate(
      id,
      userSettingsData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await UserSettings.findByIdAndDelete(id);
  }
}

export default new UserSettingsRepository();
