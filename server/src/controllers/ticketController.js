const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Asset = require("../models/Asset");

function pushActivity(ticket, user, action, note = "") {
  ticket.activityLog.push({
    action,
    performedBy: user ? user._id : null,
    role: user ? user.role : null,
    note,
    timestamp: new Date(),
  });
}

/*
EMPLOYEE
Create a new ticket
*/
async function createTicket(req, res, next) {
  try {
    const { title, description, requestType, priority, requestedChanges } =
      req.body || {};

    if (!title || !description || !requestType) {
      res.status(400);
      throw new Error("Title, description, and request type are required");
    }

    const ticket = await Ticket.create({
      title: title.trim(),
      description: description.trim(),
      requestType,
      requestedChanges: requestedChanges || {},
      priority: priority || "MEDIUM",
      createdBy: req.user._id,
      status: "PENDING_HR",
      activityLog: [
        {
          action: "CREATED",
          performedBy: req.user._id,
          role: req.user.role,
          note: "Ticket created",
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json({
      ok: true,
      message: "Ticket created successfully",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

/*
EMPLOYEE
View own tickets
HR / IT
View all tickets
*/
async function getTickets(req, res, next) {
  try {
    const { status, requestType, priority } = req.query;

    const filter = {};

    if (req.user.role === "EMPLOYEE") {
      filter.createdBy = req.user._id;
    }

    if (status) {
      filter.status = status;
    }

    if (requestType) {
      filter.requestType = requestType;
    }

    if (priority) {
      filter.priority = priority;
    }

    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .populate("activityLog.performedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      count: tickets.length,
      tickets,
    });
  } catch (err) {
    next(err);
  }
}

/*
HR
Approve ticket
*/
async function approveTicketByHR(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "PENDING_HR") {
      res.status(400);
      throw new Error("Only pending HR tickets can be approved");
    }

    ticket.status = "APPROVED_BY_HR";
    ticket.hrReviewedBy = req.user._id;
    ticket.hrComment = req.body.hrComment ? req.body.hrComment.trim() : "";

    pushActivity(
      ticket,
      req.user,
      "APPROVED_BY_HR",
      ticket.hrComment || "Ticket approved by HR"
    );

    await ticket.save();

    res.status(200).json({
      ok: true,
      message: "Ticket approved by HR",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

/*
HR
Reject ticket
*/
async function rejectTicketByHR(req, res, next) {
  try {
    const { hrComment } = req.body || {};

    if (!hrComment || !hrComment.trim()) {
      res.status(400);
      throw new Error("HR comment is required when rejecting a ticket");
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "PENDING_HR") {
      res.status(400);
      throw new Error("Only pending HR tickets can be rejected");
    }

    ticket.status = "REJECTED_BY_HR";
    ticket.hrReviewedBy = req.user._id;
    ticket.hrComment = hrComment.trim();

    pushActivity(ticket, req.user, "REJECTED_BY_HR", ticket.hrComment);

    await ticket.save();

    res.status(200).json({
      ok: true,
      message: "Ticket rejected by HR",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Start working on HR-approved ticket
*/
async function startTicketByIT(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "APPROVED_BY_HR") {
      res.status(400);
      throw new Error("Only HR-approved tickets can be started by IT");
    }

    if (ticket.itHandledBy) {
      res.status(400);
      throw new Error("This ticket is already being handled by IT");
    }

    const allowedTypes = [
      "ASSET_ASSIGNMENT",
      "ASSET_UNASSIGNMENT",
      "ACCOUNT_UPDATE",
      "ACCOUNT_DELETION",
    ];

    if (!allowedTypes.includes(ticket.requestType)) {
      res.status(400);
      throw new Error("This ticket type cannot be processed by IT");
    }

    ticket.status = "IN_PROGRESS_BY_IT";
    ticket.itHandledBy = req.user._id;

    pushActivity(ticket, req.user, "STARTED_BY_IT", "Ticket work started by IT");

    await ticket.save();

    res.status(200).json({
      ok: true,
      message: "Ticket is now in progress by IT",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Resolve ticket
Use this for non-structured/manual IT work if needed
*/
async function resolveTicketByIT(req, res, next) {
  try {
    const { resolutionNote } = req.body || {};

    if (!resolutionNote || !resolutionNote.trim()) {
      res.status(400);
      throw new Error("Resolution note is required");
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "IN_PROGRESS_BY_IT") {
      res.status(400);
      throw new Error("Only in-progress IT tickets can be resolved");
    }

    ticket.status = "RESOLVED";
    ticket.itHandledBy = req.user._id;
    ticket.resolutionNote = resolutionNote.trim();

    pushActivity(ticket, req.user, "RESOLVED", ticket.resolutionNote);

    await ticket.save();

    res.status(200).json({
      ok: true,
      message: "Ticket resolved successfully",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Execute structured HR-approved ticket and resolve it
*/
async function executeTicketByIT(req, res, next) {
  try {
    const { resolutionNote } = req.body || {};

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (
      ticket.status !== "APPROVED_BY_HR" &&
      ticket.status !== "IN_PROGRESS_BY_IT"
    ) {
      res.status(400);
      throw new Error("Only HR-approved or in-progress tickets can be executed");
    }

    const changes = ticket.requestedChanges || {};

    if (ticket.requestType === "ASSET_ASSIGNMENT") {
      const { assetId, userId } = changes;

      if (!assetId || !userId) {
        res.status(400);
        throw new Error("assetId and userId are required in requestedChanges");
      }

      const asset = await Asset.findById(assetId);
      if (!asset) {
        res.status(404);
        throw new Error("Asset not found");
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(400);
        throw new Error("Invalid user");
      }

      if (asset.status === "ASSIGNED") {
        res.status(400);
        throw new Error("Asset is already assigned");
      }

      asset.assignedTo = user._id;
      asset.status = "ASSIGNED";
      await asset.save();
    } else if (ticket.requestType === "ASSET_UNASSIGNMENT") {
      const { assetId } = changes;

      if (!assetId) {
        res.status(400);
        throw new Error("assetId is required in requestedChanges");
      }

      const asset = await Asset.findById(assetId);
      if (!asset) {
        res.status(404);
        throw new Error("Asset not found");
      }

      asset.assignedTo = null;
      asset.status = "AVAILABLE";
      await asset.save();
    } else if (ticket.requestType === "ACCOUNT_UPDATE") {
      const { employeeId, name, email, department, jobTitle, location } =
        changes;

      if (!employeeId) {
        res.status(400);
        throw new Error("employeeId is required in requestedChanges");
      }

      const employee = await User.findById(employeeId);
      if (!employee || employee.role !== "EMPLOYEE") {
        res.status(400);
        throw new Error("Invalid employee");
      }

      if (name !== undefined) employee.name = String(name).trim();
      if (email !== undefined) {
        employee.email = String(email).trim().toLowerCase();
      }
      if (department !== undefined) {
        employee.department = String(department).trim();
      }
      if (jobTitle !== undefined) {
        employee.jobTitle = String(jobTitle).trim();
      }
      if (location !== undefined) {
        employee.location = String(location).trim();
      }

      await employee.save();
    } else if (ticket.requestType === "ACCOUNT_DELETION") {
      const { employeeId } = changes;

      if (!employeeId) {
        res.status(400);
        throw new Error("employeeId is required in requestedChanges");
      }

      const employee = await User.findById(employeeId);
      if (!employee || employee.role !== "EMPLOYEE") {
        res.status(400);
        throw new Error("Invalid employee");
      }

      await Ticket.deleteMany({ createdBy: employee._id });
      await User.deleteOne({ _id: employee._id });
    } else {
      res.status(400);
      throw new Error("This ticket type is not executable by IT");
    }

    ticket.status = "RESOLVED";
    ticket.itHandledBy = req.user._id;
    ticket.resolutionNote = resolutionNote
      ? resolutionNote.trim()
      : "Executed successfully";

    pushActivity(ticket, req.user, "EXECUTED_BY_IT", ticket.resolutionNote);

    await ticket.save();

    res.status(200).json({
      ok: true,
      message: "Ticket executed and resolved successfully",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

async function getTicketById(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email role department jobTitle location")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .populate("activityLog.performedBy", "name email role");

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (
      req.user.role === "EMPLOYEE" &&
      ticket.createdBy._id.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error("Access denied");
    }

    res.status(200).json({
      ok: true,
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

async function resubmitRejectedTicket(req, res, next) {
  try {
    const {
      title,
      description,
      requestType,
      priority,
      requestedChanges,
    } = req.body || {};

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (ticket.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only update your own tickets");
    }

    if (ticket.status !== "REJECTED_BY_HR") {
      res.status(400);
      throw new Error("Only HR-rejected tickets can be resubmitted");
    }

    if (!title || !description || !requestType) {
      res.status(400);
      throw new Error("Title, description, and request type are required");
    }

    ticket.title = title.trim();
    ticket.description = description.trim();
    ticket.requestType = requestType;
    ticket.requestedChanges = requestedChanges || {};
    ticket.priority = priority || "MEDIUM";
    ticket.status = "PENDING_HR";
    ticket.hrReviewedBy = null;
    ticket.itHandledBy = null;
    ticket.hrComment = "";
    ticket.resolutionNote = "";

    pushActivity(ticket, req.user, "RESUBMITTED", "Ticket resubmitted by employee");

    await ticket.save();

    res.status(200).json({
      ok: true,
      message: "Ticket resubmitted successfully",
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  resubmitRejectedTicket,
  approveTicketByHR,
  rejectTicketByHR,
  startTicketByIT,
  resolveTicketByIT,
  executeTicketByIT,
};