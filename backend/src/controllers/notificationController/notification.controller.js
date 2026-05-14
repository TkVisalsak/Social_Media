import Notification from "../../models/notificationModel/notification.model.js";
import TryCatch from "../../utils/Trycatch.js";

// GET /api/notifications
export const getNotifications = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ recipient: userId })
    .populate("actor", "userName profilePic firstName lastName")
    .sort({ createdAt: -1 })
    .limit(80);

  res.json({ notifications });
});

// PUT /api/notifications/:id/read
export const markRead = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { isRead: true }
  );

  res.json({ success: true });
});

// PUT /api/notifications/read-all
export const markAllRead = TryCatch(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

  res.json({ success: true });
});

// Helper used by other controllers to create a notification.
export async function createNotification({ recipient, actor, type, targetId, targetType, message }) {
  if (recipient.toString() === actor.toString()) return; // don't notify yourself
  await Notification.create({ recipient, actor, type, targetId, targetType, message });
}
