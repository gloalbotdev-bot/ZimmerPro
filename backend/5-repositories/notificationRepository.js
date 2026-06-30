import Notification from '../models/Notification.js';

export class NotificationRepository {
  async findByUserId(userId, unreadOnly = false) {
    const query = { userId };
    if (unreadOnly) query.read = false;
    return await Notification.find(query).sort({ createdAt: -1 });
  }

  async create(data) {
    const notification = new Notification(data);
    return await notification.save();
  }

  async markRead(id, userId) {
    return await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );
  }

  async markAllRead(userId) {
    await Notification.updateMany({ userId, read: false }, { read: true });
  }
}

export default new NotificationRepository();
