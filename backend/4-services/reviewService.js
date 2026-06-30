import reviewRepository from '../5-repositories/reviewRepository.js';
import bookingRepository from '../5-repositories/bookingRepository.js';
import unitRepository from '../5-repositories/unitRepository.js';
import accountRepository from '../5-repositories/accountRepository.js';
import userRepository from '../5-repositories/userRepository.js';
import notificationRepository from '../5-repositories/notificationRepository.js';
import smsService from './smsService.js';

const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

const REVIEW_STATUSES = {
  PENDING_OWNER: 'pending_owner',
  COMPROMISE_SENT: 'compromise_sent',
  COUNTER_SENT: 'counter_sent',
  PUBLISHED: 'published',
  WITHDRAWN: 'withdrawn'
};

async function getOwnerUnitIds(user) {
  if (user.role === 'admin') {
    const units = await unitRepository.findAll({});
    return units.map(u => u._id.toString());
  }

  if (user.role === 'zimmer_owner') {
    const units = await unitRepository.findByUserId(user._id);
    return units.map(u => u._id.toString());
  }

  if (user.role === 'complex_owner' || user.role === 'manager') {
    const accounts = await accountRepository.findAll({ userId: user._id });
    if (accounts.length === 0) return [];
    const accountIds = accounts.map(a => a._id);
    const units = await unitRepository.findAll({
      linkType: 'account',
      linkedToId: { $in: accountIds }
    });
    return units.map(u => u._id.toString());
  }

  return [];
}

async function userOwnsUnit(user, unitId) {
  if (user.role === 'admin') return true;
  const unitIds = await getOwnerUnitIds(user);
  return unitIds.includes(unitId);
}

async function getUnitOwnerUser(unitId) {
  const unit = await unitRepository.findById(unitId);
  if (!unit) return null;

  if (unit.linkType === 'user') {
    return userRepository.findById(unit.linkedToId);
  }

  const account = await accountRepository.findById(unit.linkedToId);
  if (account?.userId) {
    return userRepository.findById(account.userId);
  }

  return null;
}

async function sendNotification(userId, type, reviewId, message) {
  if (!userId) return;
  await notificationRepository.create({ userId, type, reviewId, message });
}

async function sendSmsIfPossible(user, message) {
  if (!user?.phoneNumber) return;
  if (!process.env.INFORU_USERNAME || !process.env.INFORU_API_TOKEN) return;
  try {
    await smsService.sendMessage(
      message,
      user.phoneNumber,
      process.env.SMS_SENDER_NAME || 'ZimmerPro'
    );
  } catch (error) {
    console.error('SMS failed (non-fatal):', error.message);
  }
}

export class ReviewService {
  async autoPublishExpired() {
    const now = new Date();

    const pendingExpired = await reviewRepository.findExpiredPendingOwner(now);
    for (const review of pendingExpired) {
      await reviewRepository.update(review._id.toString(), {
        status: REVIEW_STATUSES.PUBLISHED,
        isPublished: true
      });
      if (review.guestUserId) {
        await sendNotification(
          review.guestUserId,
          'review_published',
          review._id.toString(),
          'הביקורת שלך פורסמה לאחר שחלף המועד לטיפול מצד בעל הצימר'
        );
      }
    }

    const compromiseExpired = await reviewRepository.findExpiredCompromise(now);
    for (const review of compromiseExpired) {
      await reviewRepository.update(review._id.toString(), {
        status: REVIEW_STATUSES.PUBLISHED,
        isPublished: true
      });
      if (review.guestUserId) {
        await sendNotification(
          review.guestUserId,
          'review_published',
          review._id.toString(),
          'הביקורת שלך פורסמה לאחר שלא התקבלה תגובה להצעת הפשרה'
        );
      }
    }
  }

  async getEligibleUnits(user) {
    if (user.role !== 'client' && user.role !== 'customer') {
      throw new Error('Only guests can fetch eligible units');
    }

    const fiveYearsAgo = new Date(Date.now() - FIVE_YEARS_MS).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const bookings = await bookingRepository.findAll({
      userId: user._id.toString(),
      status: { $nin: ['cancelled'] },
      checkOut: { $gte: fiveYearsAgo, $lte: today }
    });

    const unitIds = [...new Set(bookings.map(b => b.unitId))];
    const units = [];

    for (const id of unitIds) {
      const unit = await unitRepository.findById(id);
      if (unit) units.push(unit.toJSON());
    }

    return units;
  }

  async getAllReviews(user) {
    await this.autoPublishExpired();

    let query = {};

    if (user.role === 'admin') {
      // all reviews
    } else if (user.role === 'client' || user.role === 'customer') {
      query.guestUserId = user._id.toString();
    } else if (['zimmer_owner', 'complex_owner', 'manager'].includes(user.role)) {
      const unitIds = await getOwnerUnitIds(user);
      if (unitIds.length === 0) return [];
      query.unitId = { $in: unitIds };
    } else {
      return [];
    }

    const reviews = await reviewRepository.findAll(query);
    return reviews
      .map(r => r.toJSON())
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }

  async getReviewById(id, user) {
    await this.autoPublishExpired();

    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    if (user.role === 'admin') {
      return review.toJSON();
    }

    if (user.role === 'client' || user.role === 'customer') {
      if (review.guestUserId !== user._id.toString()) {
        throw new Error('Access denied');
      }
      return review.toJSON();
    }

    const owns = await userOwnsUnit(user, review.unitId);
    if (!owns) {
      throw new Error('Access denied');
    }

    return review.toJSON();
  }

  async createReview(reviewData, user) {
    if (user.role !== 'client' && user.role !== 'customer') {
      throw new Error('Only guests can create reviews');
    }

    if (!reviewData.unitId || !reviewData.comment) {
      throw new Error('unitId and comment are required');
    }

    const eligible = await this.getEligibleUnits(user);
    if (!eligible.find(u => u.id === reviewData.unitId)) {
      throw new Error('You can only review units you stayed at in the last 5 years');
    }

    const now = new Date();
    const ownerDeadline = new Date(now.getTime() + FORTY_EIGHT_HOURS_MS);

    const review = await reviewRepository.create({
      unitId: reviewData.unitId,
      guestName: user.name,
      guestUserId: user._id.toString(),
      rating: reviewData.rating ?? null,
      comment: reviewData.comment,
      date: reviewData.date || now.toISOString().split('T')[0],
      bookingId: reviewData.bookingId || null,
      isPublished: false,
      status: REVIEW_STATUSES.PENDING_OWNER,
      ownerResponseDeadline: ownerDeadline
    });

    const owner = await getUnitOwnerUser(reviewData.unitId);
    if (owner) {
      await sendNotification(
        owner._id.toString(),
        'new_review',
        review._id.toString(),
        `ביקורת חדשה מ${user.name} — נדרש טיפול תוך 48 שעות`
      );
      await sendSmsIfPossible(
        owner,
        `ביקורת חדשה התקבלה על היחידה שלך מ${user.name}. היכנס למערכת לטיפול.`
      );
    }

    return review.toJSON();
  }

  async sendCompromise(id, compromiseData, user) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    const owns = await userOwnsUnit(user, review.unitId);
    if (user.role !== 'admin' && !owns) {
      throw new Error('Access denied');
    }

    if (![REVIEW_STATUSES.PENDING_OWNER, REVIEW_STATUSES.COUNTER_SENT].includes(review.status)) {
      throw new Error('Cannot send compromise for this review');
    }

    if (!compromiseData?.type) {
      throw new Error('Compromise type is required');
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + FORTY_EIGHT_HOURS_MS);

    const updated = await reviewRepository.update(id, {
      status: REVIEW_STATUSES.COMPROMISE_SENT,
      compromiseOffer: {
        type: compromiseData.type,
        customText: compromiseData.customText || '',
        sentAt: now
      },
      compromiseDeadline: deadline
    });

    const guest = await userRepository.findById(review.guestUserId);
    await sendNotification(
      review.guestUserId,
      'compromise_received',
      id,
      'התקבלה הצעת פשרה מבעל הצימר — יש להגיב תוך 48 שעות'
    );
    await sendSmsIfPossible(
      guest,
      'התקבלה הצעת פשרה לביקורת שלך. היכנס למערכת להגיב.'
    );

    return updated.toJSON();
  }

  async respondToCompromise(id, responseData, user) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    if (review.guestUserId !== user._id.toString()) {
      throw new Error('Access denied');
    }

    if (review.status !== REVIEW_STATUSES.COMPROMISE_SENT) {
      throw new Error('No pending compromise to respond to');
    }

    const { action, counterText } = responseData;
    const now = new Date();
    let update = {};

    if (action === 'accept') {
      update = {
        status: REVIEW_STATUSES.WITHDRAWN,
        isPublished: false,
        guestResponse: { action: 'accepted', text: '', respondedAt: now }
      };
    } else if (action === 'reject') {
      update = {
        status: REVIEW_STATUSES.PUBLISHED,
        isPublished: true,
        guestResponse: { action: 'rejected', text: '', respondedAt: now }
      };
    } else if (action === 'counter') {
      update = {
        status: REVIEW_STATUSES.COUNTER_SENT,
        guestResponse: {
          action: 'counter',
          text: counterText || '',
          respondedAt: now
        }
      };
    } else {
      throw new Error('Invalid action — use accept, reject, or counter');
    }

    const updated = await reviewRepository.update(id, update);

    if (action === 'counter') {
      const owner = await getUnitOwnerUser(review.unitId);
      if (owner) {
        await sendNotification(
          owner._id.toString(),
          'guest_counter',
          id,
          'התקבלה תגובה נגדית מהאורח'
        );
        await sendSmsIfPossible(owner, 'התקבלה תגובה נגדית לביקורת. היכנס למערכת להמשך טיפול.');
      }
    }

    return updated.toJSON();
  }

  async updateReview(id, reviewData, user) {
    if (user.role !== 'admin') {
      throw new Error('Access denied');
    }

    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    const updatedReview = await reviewRepository.update(id, reviewData);
    return updatedReview.toJSON();
  }

  async deleteReview(id, user) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    if (user.role !== 'admin') {
      const owns = await userOwnsUnit(user, review.unitId);
      if (!owns) {
        throw new Error('Access denied');
      }
    }

    await reviewRepository.delete(id);
    return { message: 'Review deleted successfully' };
  }

  async getNotifications(user) {
    return (await notificationRepository.findByUserId(user._id.toString()))
      .map(n => n.toJSON());
  }

  async markNotificationRead(id, user) {
    const notification = await notificationRepository.markRead(id, user._id.toString());
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification.toJSON();
  }

  async markAllNotificationsRead(user) {
    await notificationRepository.markAllRead(user._id.toString());
    return { message: 'All notifications marked as read' };
  }
}

export default new ReviewService();
