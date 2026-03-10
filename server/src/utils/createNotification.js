const Notification = require("../models/Notification");

async function createNotification({
  recipient,
  sender = null,
  ticket = null,
  type,
  title,
  message,
}) {
  if (!recipient) {
    throw new Error("Notification recipient is required");
  }

  if (!type) {
    throw new Error("Notification type is required");
  }

  if (!title || !title.trim()) {
    throw new Error("Notification title is required");
  }

  if (!message || !message.trim()) {
    throw new Error("Notification message is required");
  }

  const notification = await Notification.create({
    recipient,
    sender,
    ticket,
    type,
    title: title.trim(),
    message: message.trim(),
  });

  return notification;
}

module.exports = createNotification;