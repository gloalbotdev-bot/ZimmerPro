import User from '../models/User.js';

export class UserRepository {
  async findAll(query = {}) {
    return await User.find(query);
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async update(id, userData) {
    return await User.findByIdAndUpdate(
      id,
      userData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
