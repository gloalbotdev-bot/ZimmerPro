import facilityRepository from '../5-repositories/facilityRepository.js';

export class FacilityService {
  async getAllFacilities(user) {
    // Facilities are global - everyone sees the same list
    // No filtering by accountId or userId
    const facilities = await facilityRepository.findAll({});
    return facilities.map(f => f.toJSON());
  }

  async getFacilityById(id, user) {
    const facility = await facilityRepository.findById(id);
    
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Facilities are global - no access check needed
    return facility.toJSON();
  }

  async createFacility(facilityData, user) {
    // Facilities are global - no accountId or userId needed
    // They are linked to units via Unit.facilityIds array
    const data = {
      name: facilityData.name,
      category: facilityData.category,
      icon: facilityData.icon || ''
    };

    const facility = await facilityRepository.create(data);
    return facility.toJSON();
  }

  async updateFacility(id, facilityData, user) {
    const facility = await facilityRepository.findById(id);
    
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Facilities are global - no access check needed
    const updatedFacility = await facilityRepository.update(id, facilityData);
    return updatedFacility.toJSON();
  }

  async deleteFacility(id, user) {
    const facility = await facilityRepository.findById(id);
    
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Facilities are global - no access check needed
    await facilityRepository.delete(id);
    return { message: 'Facility deleted successfully' };
  }
}

export default new FacilityService();
