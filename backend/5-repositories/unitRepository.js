import Unit from '../models/Unit.js';

export class UnitRepository {
  async findAll(query = {}) {
    return await Unit.find(query);
  }

  async findById(id) {
    return await Unit.findById(id);
  }

  async create(unitData) {
    const unit = new Unit(unitData);
    return await unit.save();
  }

  async update(id, unitData) {
    return await Unit.findByIdAndUpdate(
      id,
      unitData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Unit.findByIdAndDelete(id);
  }

  async findByAccountId(accountId) {
    return await Unit.find({ 
      linkType: 'account',
      linkedToId: accountId 
    });
  }

  async findByUserId(userId) {
    return await Unit.find({ 
      linkType: 'user',
      linkedToId: userId 
    });
  }
}

export default new UnitRepository();
