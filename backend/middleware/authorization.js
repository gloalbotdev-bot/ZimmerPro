/**
 * Authorization Middleware
 * Checks if user has permission to access specific resources
 */

import Unit from '../models/Unit.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

/**
 * Check if user can access a unit
 * - admin: can access all units
 * - zimmer_owner/complex_owner: can access only their units (accountId match)
 * - client: cannot access units
 */
export const canAccessUnit = async (req, res, next) => {
  try {
    const user = req.user;
    const unitId = req.params.id || req.body.unitId;

    if (!unitId && req.method === 'POST') {
      // Creating new unit - check authorization by role
      return next();
    }

    if (!unitId) {
      return next(); // Let controller handle it
    }

    if (user.role === 'admin') {
      return next(); // Admin can access everything
    }

    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        error: 'Unit not found'
      });
    }

    // Check if user owns this unit (via accountId)
    if (user.role === 'zimmer_owner' || user.role === 'complex_owner') {
      if (unit.accountId && unit.accountId.toString() === user.accountId?.toString()) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'You do not have permission to access this unit'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * Check if user can access a booking
 * - admin: can access all bookings
 * - zimmer_owner/complex_owner: can access bookings for their units
 * - client/customer: can access only their own bookings
 */
export const canAccessBooking = async (req, res, next) => {
  try {
    const user = req.user;
    const bookingId = req.params.id || req.body.bookingId;

    if (!bookingId && req.method === 'POST') {
      return next(); // Creating new booking
    }

    if (!bookingId) {
      return next();
    }

    if (user.role === 'admin') {
      return next();
    }

    const booking = await Booking.findById(bookingId).populate('unitId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Owner can access if booking is for their unit
    if (user.role === 'zimmer_owner' || user.role === 'complex_owner' || user.role === 'manager') {
      const unit = await Unit.findById(booking.unitId);
      if (!unit) {
        return res.status(404).json({
          success: false,
          error: 'Unit not found'
        });
      }
      
      // zimmer_owner without account: check by userId
      if (user.role === 'zimmer_owner' && !user.accountId) {
        if (unit.userId?.toString() === user._id?.toString()) {
          return next();
        }
      } else {
        // zimmer_owner with account or complex_owner/manager: check by accountId
        if (unit.accountId?.toString() === user.accountId?.toString()) {
          return next();
        }
      }
    }

    // Client can access only their own bookings
    if (user.role === 'client' || user.role === 'customer') {
      if (booking.userId?.toString() === user._id.toString()) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'You do not have permission to access this booking'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * Check role-based access
 * Usage: checkRole('admin', 'zimmer_owner')
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};
