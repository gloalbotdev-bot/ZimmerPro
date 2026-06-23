import reviewService from '../4-services/reviewService.js';

export class ReviewController {
  async getAll(req, res, next) {
    try {
      const reviews = await reviewService.getAllReviews(req.user);
      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const review = await reviewService.getReviewById(req.params.id, req.user);
      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      if (error.message === 'Review not found') {
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
      const review = await reviewService.createReview(req.body, req.user);
      res.status(201).json({
        success: true,
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const review = await reviewService.updateReview(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      if (error.message === 'Review not found') {
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
      const result = await reviewService.deleteReview(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Review not found') {
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

export default new ReviewController();
