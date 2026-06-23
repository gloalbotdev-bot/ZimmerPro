import Room from '../models/Room.js';

export class RoomRepository {
  async findAll(query = {}) {
    return await Room.find(query);
  }

  async findById(id) {
    return await Room.findById(id);
  }

  async create(roomData) {
    const room = new Room(roomData);
    return await room.save();
  }

  async update(id, roomData) {
    return await Room.findByIdAndUpdate(
      id,
      roomData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Room.findByIdAndDelete(id);
  }

  async findByUnitId(unitId) {
    return await Room.find({ unitId: unitId });
  }

  async deleteByUnitId(unitId) {
    return await Room.deleteMany({ unitId: unitId });
  }
}

export default new RoomRepository();
