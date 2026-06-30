import Review from '../models/Review.js';

export class ReviewRepository {
  async findAll(query = {}) {
    return await Review.find(query);
  }

  async findById(id) {
    return await Review.findById(id);
  }

  async create(reviewData) {
    const review = new Review(reviewData);
    return await review.save();
  }

  async update(id, reviewData) {
    return await Review.findByIdAndUpdate(
      id,
      reviewData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Review.findByIdAndDelete(id);
  }

  async findByUnitId(unitId) {
    return await Review.find({ unitId });
  }

  async findExpiredPendingOwner(now) {
    return await Review.find({
      status: 'pending_owner',
      ownerResponseDeadline: { $lt: now }
    });
  }

  async findExpiredCompromise(now) {
    return await Review.find({
      status: 'compromise_sent',
      compromiseDeadline: { $lt: now }
    });
  }
}

export default new ReviewRepository();
