import reviewService from '../4-services/reviewService.js';

function handleReviewError(error, res, next) {
  if (error.message === 'Review not found') {
    return res.status(404).json({ success: false, error: error.message });
  }
  if (error.message === 'Access denied' || error.message === 'Only guests can create reviews' ||
      error.message === 'Only guests can fetch eligible units') {
    return res.status(403).json({ success: false, error: error.message });
  }
  if (error.message.includes('required') || error.message.includes('Invalid') ||
      error.message.includes('Cannot') || error.message.includes('No pending') ||
      error.message.includes('can only review')) {
    return res.status(400).json({ success: false, error: error.message });
  }
  next(error);
}

export class ReviewController {
  async getAll(req, res, next) {
    try {
      const reviews = await reviewService.getAllReviews(req.user);
      res.json({ success: true, data: reviews });
    } catch (error) {
      next(error);
    }
  }

  async getEligibleUnits(req, res, next) {
    try {
      const units = await reviewService.getEligibleUnits(req.user);
      res.json({ success: true, data: units });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }

  async getNotifications(req, res, next) {
    try {
      const notifications = await reviewService.getNotifications(req.user);
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const notification = await reviewService.markNotificationRead(req.params.id, req.user);
      res.json({ success: true, data: notification });
    } catch (error) {
      if (error.message === 'Notification not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  async markAllNotificationsRead(req, res, next) {
    try {
      const result = await reviewService.markAllNotificationsRead(req.user);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const review = await reviewService.getReviewById(req.params.id, req.user);
      res.json({ success: true, data: review });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }

  async create(req, res, next) {
    try {
      const review = await reviewService.createReview(req.body, req.user);
      res.status(201).json({ success: true, data: review });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }

  async sendCompromise(req, res, next) {
    try {
      const review = await reviewService.sendCompromise(req.params.id, req.body, req.user);
      res.json({ success: true, data: review });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }

  async respondToCompromise(req, res, next) {
    try {
      const review = await reviewService.respondToCompromise(req.params.id, req.body, req.user);
      res.json({ success: true, data: review });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }

  async update(req, res, next) {
    try {
      const review = await reviewService.updateReview(req.params.id, req.body, req.user);
      res.json({ success: true, data: review });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await reviewService.deleteReview(req.params.id, req.user);
      res.json({ success: true, message: result.message });
    } catch (error) {
      handleReviewError(error, res, next);
    }
  }
}

export default new ReviewController();
