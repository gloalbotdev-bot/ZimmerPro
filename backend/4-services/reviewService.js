import reviewRepository from '../5-repositories/reviewRepository.js';
import unitRepository from '../5-repositories/unitRepository.js';

export class ReviewService {
  async getAllReviews(user) {
    let query = {};
    
    // Filter by accountId if user is not admin
    if (user.role !== 'admin' && user.accountId) {
      const units = await unitRepository.findByAccountId(user.accountId);
      const unitIds = units.map(u => u._id.toString());
      query.unitId = { $in: unitIds };
    }

    const reviews = await reviewRepository.findAll(query);
    return reviews.map(r => r.toJSON());
  }

  async getReviewById(id, user) {
    const review = await reviewRepository.findById(id);
    
    if (!review) {
      throw new Error('Review not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(review.unitId);
      if (!unit || unit.accountId?.toString() !== user.accountId?.toString()) {
        throw new Error('Access denied');
      }
    }

    return review.toJSON();
  }

  async createReview(reviewData, user) {
    const review = await reviewRepository.create(reviewData);
    return review.toJSON();
  }

  async updateReview(id, reviewData, user) {
    const review = await reviewRepository.findById(id);
    
    if (!review) {
      throw new Error('Review not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(review.unitId);
      if (!unit || unit.accountId?.toString() !== user.accountId?.toString()) {
        throw new Error('Access denied');
      }
    }

    const updatedReview = await reviewRepository.update(id, reviewData);
    return updatedReview.toJSON();
  }

  async deleteReview(id, user) {
    const review = await reviewRepository.findById(id);
    
    if (!review) {
      throw new Error('Review not found');
    }

    // Check access
    if (user.role !== 'admin') {
      const unit = await unitRepository.findById(review.unitId);
      if (!unit || unit.accountId?.toString() !== user.accountId?.toString()) {
        throw new Error('Access denied');
      }
    }

    await reviewRepository.delete(id);
    return { message: 'Review deleted successfully' };
  }
}

export default new ReviewService();
