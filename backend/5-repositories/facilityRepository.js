import Facility from '../models/Facility.js';

export class FacilityRepository {
  async findAll(query = {}) {
    return await Facility.find(query);
  }

  async findById(id) {
    return await Facility.findById(id);
  }

  async create(facilityData) {
    const facility = new Facility(facilityData);
    return await facility.save();
  }

  async update(id, facilityData) {
    return await Facility.findByIdAndUpdate(
      id,
      facilityData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Facility.findByIdAndDelete(id);
  }

  async findByAccountId(accountId) {
    return await Facility.find({ accountId });
  }
}

export default new FacilityRepository();
