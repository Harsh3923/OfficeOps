const Notification = require("../models/Notification");

/*
Get current user's notifications
Supports pagination
*/
async function getMyNotifications(req, res, next) {
  try {
    const { page = 1, limit = 10, isRead, type } = req.query;

    const filter = {
      recipient: req.user._id,
    };

    if (isRead === "true") {
      filter.isRead = true;
    } else if (isRead === "false") {
      filter.isRead = false;
    }

    if (type) {
      filter.type = type;
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Notification.countDocuments(filter);

    const notifications = await Notification.find(filter)
      .populate("sender", "name email role")
      .populate("ticket", "title status requestType priority")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    res.status(200).json({
      ok: true,
      count: notifications.length,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber < Math.ceil(total / limitNumber),
      hasPrevPage: pageNumber > 1,
      notifications,
    });
  } catch (err) {
    next(err);
  }
}

/*
Get unread notification count for current user
*/
async function getUnreadNotificationCount(req, res, next) {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      ok: true,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

/*
Mark one notification as read
*/
async function markNotificationAsRead(req, res, next) {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      res.status(404);
      throw new Error("Notification not found");
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access denied");
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const updatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email role")
      .populate("ticket", "title status requestType priority");

    res.status(200).json({
      ok: true,
      message: "Notification marked as read",
      notification: updatedNotification,
    });
  } catch (err) {
    next(err);
  }
}

/*
Mark all current user's notifications as read
*/
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json({
      ok: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};