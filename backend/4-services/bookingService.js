import bookingRepository from '../5-repositories/bookingRepository.js';
import unitRepository from '../5-repositories/unitRepository.js';
import userRepository from '../5-repositories/userRepository.js';
import googleCalendarService from './googleCalendarService.js';

export class BookingService {
  async resolveBookingUserId(bookingData, creator) {
    if (creator.role === 'client' || creator.role === 'customer') {
      return creator._id.toString();
    }
    const rawUserId = bookingData.userId;
    if (!rawUserId) {
      return null;
    }
    const guestUser = await userRepository.findById(bookingData.userId);
    if (!guestUser || !['client', 'customer'].includes(guestUser.role)) {
      throw new Error('Invalid guest user — select a registered client');
    }
    return guestUser._id.toString();
  }

  async getAllBookings(user) {
    let query = {};
    
    if (user.role === 'admin') {
      // Admin sees all bookings
      const bookings = await bookingRepository.findAll({});
      return bookings.map(b => b.toJSON());
    }
    
    if (user.role === 'zimmer_owner' || user.role === 'complex_owner' || user.role === 'manager') {
      // Owners see bookings for their units
      if (user.role === 'zimmer_owner' && !user.accountId) {
        // zimmer_owner without account: filter by userId of units
        const units = await unitRepository.findAll({ userId: user._id });
        const unitIds = units.map(u => u._id.toString());
        if (unitIds.length > 0) {
          query.unitId = { $in: unitIds };
        } else {
          // No units = no bookings
          return [];
        }
      } else if (user.accountId) {
        // complex_owner/manager or zimmer_owner with account: filter by accountId
        const units = await unitRepository.findByAccountId(user.accountId);
        const unitIds = units.map(u => u._id.toString());
        if (unitIds.length > 0) {
          query.unitId = { $in: unitIds };
        } else {
          // No units = no bookings
          return [];
        }
      } else {
        // complex_owner/manager without accountId = no bookings
        return [];
      }
    } else if (user.role === 'client' || user.role === 'customer') {
      // Clients see only their own bookings
      query.userId = user._id.toString();
    }

    const bookings = await bookingRepository.findAll(query);
    return bookings.map(b => b.toJSON());
  }

  async getBookingById(id, user) {
    const booking = await bookingRepository.findById(id);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(booking.unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      // zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !user.accountId) {
        if (unit.userId?.toString() !== user._id?.toString()) {
          throw new Error('Access denied');
        }
      } else if (user.role === 'zimmer_owner' || user.role === 'complex_owner' || user.role === 'manager') {
        // zimmer_owner with account or complex_owner/manager: check by accountId
        if (unit.accountId?.toString() !== user.accountId?.toString()) {
          throw new Error('Access denied');
        }
      } else if (user.role === 'client' || user.role === 'customer') {
        if (booking.userId?.toString() !== user._id?.toString()) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    return booking.toJSON();
  }

  async createBooking(bookingData, user) {
    const { unitId, checkIn, checkOut } = bookingData;

    if (!unitId || !checkIn || !checkOut) {
      throw new Error('unitId, checkIn and checkOut are required');
    }

    if (checkIn >= checkOut) {
      throw new Error('checkOut must be after checkIn');
    }

    const conflict = await bookingRepository.hasOverlap(unitId, checkIn, checkOut);
    if (conflict) {
      throw new Error('Unit is already booked for the selected dates');
    }

    const dataToCreate = { ...bookingData };
    dataToCreate.userId = await this.resolveBookingUserId(bookingData, user);

    const booking = await bookingRepository.create(dataToCreate);
    
    // Sync to Google Calendar if user has it connected
    if (user.googleCalendarLinked && booking.status !== 'cancelled') {
      try {
        const unit = await unitRepository.findById(booking.unitId);
        if (unit) {
          const eventId = await googleCalendarService.syncBookingToGoogleCalendar(booking, unit, user._id.toString());
          if (eventId) {
            // Update booking with event ID and sync status
            await bookingRepository.update(booking._id.toString(), {
              googleCalendarEventId: eventId,
              googleSynced: true
            });
            booking.googleCalendarEventId = eventId;
            booking.googleSynced = true;
          }
        }
      } catch (error) {
        console.error('❌ [BookingService] Google Calendar sync error (non-fatal):', error.message);
        // Continue even if calendar sync fails
      }
    }
    
    return booking.toJSON();
  }

  async updateBooking(id, bookingData, user) {
    const booking = await bookingRepository.findById(id);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(booking.unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      // zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !user.accountId) {
        if (unit.userId?.toString() !== user._id?.toString()) {
          throw new Error('Access denied');
        }
      } else if (user.role === 'zimmer_owner' || user.role === 'complex_owner' || user.role === 'manager') {
        // zimmer_owner with account or complex_owner/manager: check by accountId
        if (unit.accountId?.toString() !== user.accountId?.toString()) {
          throw new Error('Access denied');
        }
      } else if (user.role === 'client' || user.role === 'customer') {
        if (booking.userId?.toString() !== user._id?.toString()) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    // Check for date overlap if dates or unit are being changed (skip if cancelling)
    const newCheckIn  = bookingData.checkIn  ?? booking.checkIn;
    const newCheckOut = bookingData.checkOut ?? booking.checkOut;
    const newUnitId   = bookingData.unitId   ?? booking.unitId;
    const newStatus   = bookingData.status   ?? booking.status;

    if (newStatus !== 'cancelled' && (bookingData.checkIn || bookingData.checkOut || bookingData.unitId)) {
      if (newCheckIn >= newCheckOut) {
        throw new Error('checkOut must be after checkIn');
      }
      const conflict = await bookingRepository.hasOverlap(newUnitId, newCheckIn, newCheckOut, id);
      if (conflict) {
        throw new Error('Unit is already booked for the selected dates');
      }
    }

    const updatePayload = { ...bookingData };
    if (user.role === 'client' || user.role === 'customer') {
      delete updatePayload.userId;
    } else if ('userId' in bookingData) {
      updatePayload.userId = await this.resolveBookingUserId(bookingData, user);
    }

    const updatedBooking = await bookingRepository.update(id, updatePayload);
    
    // Sync to Google Calendar if user has it connected
    if (user.googleCalendarLinked) {
      try {
        const unit = await unitRepository.findById(updatedBooking.unitId);
        if (unit) {
          // If cancelled, delete event; otherwise update/create
          if (updatedBooking.status === 'cancelled' && booking.googleCalendarEventId) {
            await googleCalendarService.deleteCalendarEvent(booking.googleCalendarEventId, user._id.toString());
            await bookingRepository.update(id, {
              googleCalendarEventId: null,
              googleSynced: false
            });
          } else if (updatedBooking.status !== 'cancelled') {
            const eventId = await googleCalendarService.syncBookingToGoogleCalendar(updatedBooking, unit, user._id.toString());
            if (eventId) {
              await bookingRepository.update(id, {
                googleCalendarEventId: eventId,
                googleSynced: true
              });
              updatedBooking.googleCalendarEventId = eventId;
              updatedBooking.googleSynced = true;
            }
          }
        }
      } catch (error) {
        console.error('❌ [BookingService] Google Calendar sync error (non-fatal):', error.message);
        // Continue even if calendar sync fails
      }
    }
    
    return updatedBooking.toJSON();
  }

  async deleteBooking(id, user) {
    const booking = await bookingRepository.findById(id);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(booking.unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      // zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !user.accountId) {
        if (unit.userId?.toString() !== user._id?.toString()) {
          throw new Error('Access denied');
        }
      } else if (user.role === 'zimmer_owner' || user.role === 'complex_owner' || user.role === 'manager') {
        // zimmer_owner with account or complex_owner/manager: check by accountId
        if (unit.accountId?.toString() !== user.accountId?.toString()) {
          throw new Error('Access denied');
        }
      } else if (user.role === 'client' || user.role === 'customer') {
        if (booking.userId?.toString() !== user._id?.toString()) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    // Delete from Google Calendar if exists
    if (user.googleCalendarLinked && booking.googleCalendarEventId) {
      try {
        await googleCalendarService.deleteCalendarEvent(booking.googleCalendarEventId, user._id.toString());
      } catch (error) {
        console.error('❌ [BookingService] Google Calendar delete error (non-fatal):', error.message);
        // Continue even if calendar delete fails
      }
    }

    await bookingRepository.delete(id);
    return { message: 'Booking deleted successfully' };
  }
}

export default new BookingService();
