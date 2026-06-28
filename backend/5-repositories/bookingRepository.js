import Booking from '../models/Booking.js';

export class BookingRepository {
  async findAll(query = {}) {
    return await Booking.find(query);
  }

  async findById(id) {
    return await Booking.findById(id);
  }

  async create(bookingData) {
    const booking = new Booking(bookingData);
    return await booking.save();
  }

  async update(id, bookingData) {
    return await Booking.findByIdAndUpdate(
      id,
      bookingData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Booking.findByIdAndDelete(id);
  }

  async findByUnitId(unitId) {
    return await Booking.find({ unitId });
  }

  /**
   * Checks whether an overlapping active booking exists for a given unit and date range.
   * Two bookings overlap when: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn.
   * @param {string} unitId
   * @param {string} checkIn  - ISO date string (YYYY-MM-DD)
   * @param {string} checkOut - ISO date string (YYYY-MM-DD)
   * @param {string|null} excludeBookingId - booking ID to exclude (used when updating)
   * @returns {Promise<boolean>} true if a conflict exists
   */
  async hasOverlap(unitId, checkIn, checkOut, excludeBookingId = null) {
    const query = {
      unitId,
      status: { $nin: ['cancelled'] }, // ignore cancelled bookings
      checkIn: { $lt: checkOut },       // existing checkIn < new checkOut
      checkOut: { $gt: checkIn }        // existing checkOut > new checkIn
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const conflict = await Booking.findOne(query).lean();
    return conflict !== null;
  }
}

export default new BookingRepository();
