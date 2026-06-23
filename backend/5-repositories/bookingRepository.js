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
}

export default new BookingRepository();
