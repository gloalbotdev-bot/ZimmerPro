import unitService from '../4-services/unitService.js';

export class UnitController {
  async getAll(req, res, next) {
    try {
      const units = await unitService.getAllUnits(req.user);
      res.json({
        success: true,
        data: units
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const unit = await unitService.getUnitById(req.params.id, req.user);
      res.json({
        success: true,
        data: unit
      });
    } catch (error) {
      if (error.message === 'Unit not found') {
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
      const unit = await unitService.createUnit(req.body, req.user);
      res.status(201).json({
        success: true,
        data: unit
      });
    } catch (error) {
      if (error.message === 'accountId is required3') {
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
      const unit = await unitService.updateUnit(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: unit
      });
    } catch (error) {
      if (error.message === 'Unit not found') {
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
      const result = await unitService.deleteUnit(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Unit not found') {
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

export default new UnitController();
