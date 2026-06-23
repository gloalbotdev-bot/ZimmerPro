import roomRepository from '../5-repositories/roomRepository.js';
import unitRepository from '../5-repositories/unitRepository.js';

export class RoomService {
  async getAllRooms(user) {
    let query = {};
    

    if (user.role !== 'admin' && user.accountId) {
      const units = await unitRepository.findByAccountId(user.accountId);
      const unitIds = units.map(u => u._id);
      query.unitId = { $in: unitIds };
    }

    const rooms = await roomRepository.findAll(query);
    return rooms.map(r => r.toJSON());
  }

  async getRoomById(id, user) {
    const room = await roomRepository.findById(id);
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(room.unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
 
      const unitAccountId = unit.accountId?.toString ? unit.accountId.toString() : unit.accountId;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      
 
      if (user.role === 'zimmer_owner' && !userAccountId) {
        const unitUserId = unit.userId?.toString ? unit.userId.toString() : unit.userId;
        const currentUserId = user._id?.toString ? user._id.toString() : user._id;
        if (unitUserId !== currentUserId) {
          throw new Error('Access denied');
        }
      } else if (userAccountId && unitAccountId !== userAccountId) {
      
        throw new Error('Access denied');
      }
    }

    return room.toJSON();
  }

  async createRoom(roomData, user) {
    console.log('🚪 [RoomService] createRoom called');
    console.log('🚪 [RoomService] User:', {
      id: user._id?.toString(),
      role: user.role,
      accountId: user.accountId,
      accountIdType: typeof user.accountId
    });
    console.log('🚪 [RoomService] Room data:', {
      lodging_id: roomData.lodging_id,
      unitId: roomData.unitId
    });
    
    const data = {
      ...roomData
    };

    // Always set userId - who created this room
    data.userId = user._id;

    // Convert lodging_id to unitId if provided (for backward compatibility)
    if (roomData.lodging_id && !roomData.unitId) {
      data.unitId = roomData.lodging_id;
    } else if (!data.unitId) {
      throw new Error('unitId is required');
    }

    console.log('🚪 [RoomService] Resolved unitId:', data.unitId);

    // Check access to the unit
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(data.unitId);
      if (!unit) {
        console.error('❌ [RoomService] Unit not found:', data.unitId);
        throw new Error('Unit not found');
      }
      
      console.log('🚪 [RoomService] Unit found:', {
        id: unit._id?.toString(),
        accountId: unit.accountId,
        accountIdType: typeof unit.accountId
      });
      
      // Convert both to string for comparison (handles ObjectId and string)
      const unitAccountId = unit.accountId?.toString ? unit.accountId.toString() : unit.accountId;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      
      console.log('🚪 [RoomService] Account ID comparison:', {
        unitAccountId,
        userAccountId,
        match: unitAccountId === userAccountId
      });
      
      // For zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !userAccountId) {
        const unitUserId = unit.userId?.toString ? unit.userId.toString() : unit.userId;
        const currentUserId = user._id?.toString ? user._id.toString() : user._id;
        console.log('🚪 [RoomService] User ID comparison (zimmer_owner without account):', {
          unitUserId,
          currentUserId,
          match: unitUserId === currentUserId
        });
        if (unitUserId !== currentUserId) {
          throw new Error('Access denied');
        }
      } else if (userAccountId && unitAccountId !== userAccountId) {
        // For complex_owner/manager or zimmer_owner with account: check by accountId
        console.error('❌ [RoomService] Access denied - accountId mismatch');
        throw new Error('Access denied');
      }
      
      console.log('✅ [RoomService] Access granted');
    }

    // Remove lodging_id if it exists (we use unitId now)
    delete data.lodging_id;

    const room = await roomRepository.create(data);
    return room.toJSON();
  }

  async updateRoom(id, roomData, user) {
    const room = await roomRepository.findById(id);
    
    if (!room) {
      throw new Error('Room not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(room.unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      // Convert both to string for comparison (handles ObjectId and string)
      const unitAccountId = unit.accountId?.toString ? unit.accountId.toString() : unit.accountId;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      
      // For zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !userAccountId) {
        const unitUserId = unit.userId?.toString ? unit.userId.toString() : unit.userId;
        const currentUserId = user._id?.toString ? user._id.toString() : user._id;
        if (unitUserId !== currentUserId) {
          throw new Error('Access denied');
        }
      } else if (userAccountId && unitAccountId !== userAccountId) {
        // For complex_owner/manager or zimmer_owner with account: check by accountId
        throw new Error('Access denied');
      }
    }

    // Convert lodging_id to unitId if provided (for backward compatibility)
    const data = { ...roomData };
    if (data.lodging_id && !data.unitId) {
      data.unitId = data.lodging_id;
      delete data.lodging_id;
    }

    const updatedRoom = await roomRepository.update(id, data);
    return updatedRoom.toJSON();
  }

  async deleteRoom(id, user) {
    const room = await roomRepository.findById(id);
    
    if (!room) {
      throw new Error('Room not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(room.unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      // Convert both to string for comparison (handles ObjectId and string)
      const unitAccountId = unit.accountId?.toString ? unit.accountId.toString() : unit.accountId;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      
      // For zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !userAccountId) {
        const unitUserId = unit.userId?.toString ? unit.userId.toString() : unit.userId;
        const currentUserId = user._id?.toString ? user._id.toString() : user._id;
        if (unitUserId !== currentUserId) {
          throw new Error('Access denied');
        }
      } else if (userAccountId && unitAccountId !== userAccountId) {
        // For complex_owner/manager or zimmer_owner with account: check by accountId
        throw new Error('Access denied');
      }
    }

    await roomRepository.delete(id);
    return { message: 'Room deleted successfully' };
  }

  async getRoomsByUnitId(unitId, user) {
    // Check access to the unit
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      // Convert both to string for comparison (handles ObjectId and string)
      const unitAccountId = unit.accountId?.toString ? unit.accountId.toString() : unit.accountId;
      const userAccountId = user.accountId?.toString ? user.accountId.toString() : user.accountId;
      
      // For zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !userAccountId) {
        const unitUserId = unit.userId?.toString ? unit.userId.toString() : unit.userId;
        const currentUserId = user._id?.toString ? user._id.toString() : user._id;
        if (unitUserId !== currentUserId) {
          throw new Error('Access denied');
        }
      } else if (userAccountId && unitAccountId !== userAccountId) {
        // For complex_owner/manager or zimmer_owner with account: check by accountId
        throw new Error('Access denied');
      }
    }

    const rooms = await roomRepository.findByUnitId(unitId);
    return rooms.map(r => r.toJSON());
  }
}

export default new RoomService();
