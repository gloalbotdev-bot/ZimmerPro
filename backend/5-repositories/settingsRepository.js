import Settings from '../models/Settings.js';

export class SettingsRepository {
  async findAll(query = {}) {
    return await Settings.find(query);
  }

  async findById(id) {
    return await Settings.findById(id);
  }

  async create(settingsData) {
    const settings = new Settings(settingsData);
    return await settings.save();
  }

  async update(id, settingsData) {
    return await Settings.findByIdAndUpdate(
      id,
      settingsData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Settings.findByIdAndDelete(id);
  }
}

export default new SettingsRepository();
