import facilityService from '../4-services/facilityService.js';

export class FacilityController {
  async getAll(req, res, next) {
    try {
      const facilities = await facilityService.getAllFacilities(req.user);
      res.json({
        success: true,
        data: facilities
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const facility = await facilityService.getFacilityById(req.params.id, req.user);
      res.json({
        success: true,
        data: facility
      });
    } catch (error) {
      if (error.message === 'Facility not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const facility = await facilityService.createFacility(req.body, req.user);
      res.status(201).json({
        success: true,
        data: facility
      });
    } catch (error) {
      if (error.message === 'accountId is required4') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const facility = await facilityService.updateFacility(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: facility
      });
    } catch (error) {
      if (error.message === 'Facility not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await facilityService.deleteFacility(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Facility not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }
}

export default new FacilityController();
