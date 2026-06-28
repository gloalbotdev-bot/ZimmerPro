import bookingService from '../4-services/bookingService.js';

export class BookingController {
  async getAll(req, res, next) {
    try {
      const bookings = await bookingService.getAllBookings(req.user);
      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const booking = await bookingService.getBookingById(req.params.id, req.user);
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      if (error.message === 'Booking not found') {
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
      const fromQuery = req.query && typeof req.query === 'object' ? { ...req.query } : {};
      const fromBody =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? { ...req.body } : {};
      const merged = { ...fromQuery, ...fromBody };
      if (merged.totalPrice !== undefined && merged.totalPrice !== null && merged.totalPrice !== '') {
        const n = Number(merged.totalPrice);
        if (!Number.isNaN(n)) merged.totalPrice = n;
      }
      const booking = await bookingService.createBooking(merged, req.user);
      res.status(201).json({
        success: true,
        data: booking
      });
    } catch (error) {
      if (error.message === 'Unit is already booked for the selected dates') {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'checkOut must be after checkIn') {
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
      const booking = await bookingService.updateBooking(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      if (error.message === 'Booking not found') {
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
      if (error.message === 'Unit is already booked for the selected dates') {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'checkOut must be after checkIn') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await bookingService.deleteBooking(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Booking not found') {
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

export default new BookingController();
