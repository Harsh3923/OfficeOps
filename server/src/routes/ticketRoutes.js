const express = require("express");
const { uploadTicketAttachment } = require("../middleware/uploadMiddleware");
const {
  createTicket,
  getTickets,
  getTicketById,
  getTicketHistory,
  resubmitRejectedTicket,
  approveTicketByHR,
  rejectTicketByHR,
  startTicketByIT,
  resolveTicketByIT,
  executeTicketByIT,
  getTicketDashboardSummary,
  getHRQueue,
  getITQueue,
  getMyOpenTickets,
  addTicketComment,
  getTicketComments,
  addTicketAttachment,
  getTicketAttachments,
} = require("../controllers/ticketController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/*
Dashboard + queue routes
These must come before /:id
*/
router.get("/dashboard/summary", protect, getTicketDashboardSummary);
router.get("/hr/queue", protect, authorize("HR"), getHRQueue);
router.get("/it/queue", protect, authorize("IT"), getITQueue);
router.get("/my/open", protect, authorize("EMPLOYEE"), getMyOpenTickets);

/*
General ticket routes
*/
router.get("/", protect, getTickets);
router.get("/:id/history", protect, getTicketHistory);
router.get("/:id/comments", protect, getTicketComments);
router.post("/:id/comment", protect, addTicketComment);
router.get("/:id/attachments", protect, getTicketAttachments);
router.post(
  "/:id/attachments",
  protect,
  uploadTicketAttachment.single("attachment"),
  addTicketAttachment
);
router.get("/:id", protect, getTicketById);

/*
Employee actions
*/
router.post("/", protect, authorize("EMPLOYEE"), createTicket);
router.patch("/:id/resubmit", protect, authorize("EMPLOYEE"), resubmitRejectedTicket);

/*
HR actions
*/
router.patch("/:id/approve", protect, authorize("HR"), approveTicketByHR);
router.patch("/:id/reject", protect, authorize("HR"), rejectTicketByHR);

/*
IT actions
*/
router.patch("/:id/start", protect, authorize("IT"), startTicketByIT);
router.patch("/:id/resolve", protect, authorize("IT"), resolveTicketByIT);
router.patch("/:id/execute", protect, authorize("IT"), executeTicketByIT);

module.exports = router;