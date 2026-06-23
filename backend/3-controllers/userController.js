import userService from '../4-services/userService.js';

export class UserController {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers(req.user);
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id, req.user);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error.message === 'User not found') {
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
      const user = await userService.createUser(req.body, req.user);
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error.message === 'User not found') {
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
      const result = await userService.deleteUser(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'User not found') {
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

export default new UserController();
