const express = require("express");
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/*
Current user's notifications
*/
router.get("/", protect, getMyNotifications);
router.get("/unread-count", protect, getUnreadNotificationCount);
router.patch("/read-all", protect, markAllNotificationsAsRead);
router.patch("/:id/read", protect, markNotificationAsRead);

module.exports = router;