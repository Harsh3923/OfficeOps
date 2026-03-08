const User = require("../models/User");
const Asset = require("../models/Asset");
const Ticket = require("../models/Ticket");

async function getDashboardStats(req, res, next) {
  try {
    const [
      totalEmployees,
      totalIT,
      totalHR,
      totalAssets,
      assignedAssets,
      availableAssets,
      pendingHrTickets,
      inProgressItTickets,
      resolvedTickets,
    ] = await Promise.all([
      User.countDocuments({ role: "EMPLOYEE" }),
      User.countDocuments({ role: "IT" }),
      User.countDocuments({ role: "HR" }),
      Asset.countDocuments(),
      Asset.countDocuments({ status: "ASSIGNED" }),
      Asset.countDocuments({ status: "AVAILABLE" }),
      Ticket.countDocuments({ status: "PENDING_HR" }),
      Ticket.countDocuments({ status: "IN_PROGRESS_BY_IT" }),
      Ticket.countDocuments({ status: "RESOLVED" }),
    ]);

    res.status(200).json({
      ok: true,
      stats: {
        totalEmployees,
        totalIT,
        totalHR,
        totalAssets,
        assignedAssets,
        availableAssets,
        pendingHrTickets,
        inProgressItTickets,
        resolvedTickets,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
};