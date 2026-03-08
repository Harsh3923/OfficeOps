const express = require("express");
const {
  createTicket,
  getTickets,
  getTicketById,
  resubmitRejectedTicket,
  approveTicketByHR,
  rejectTicketByHR,
  startTicketByIT,
  resolveTicketByIT,
  executeTicketByIT,
} = require("../controllers/ticketController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/*
All logged in users
*/
router.get("/", protect, getTickets);
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