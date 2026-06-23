import roomService from '../4-services/roomService.js';

export class RoomController {
  async getAll(req, res, next) {
    try {
      const rooms = await roomService.getAllRooms(req.user);
      res.json({
        success: true,
        data: rooms
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const room = await roomService.getRoomById(req.params.id, req.user);
      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      if (error.message === 'Room not found') {
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
      const room = await roomService.createRoom(req.body, req.user);
      res.status(201).json({
        success: true,
        data: room
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
      const room = await roomService.updateRoom(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      if (error.message === 'Room not found') {
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
      const result = await roomService.deleteRoom(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Room not found') {
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

export default new RoomController();
