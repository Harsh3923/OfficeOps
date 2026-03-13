const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Asset = require("../models/Asset");
const createNotification = require("../utils/createNotification");

function pushActivity(ticket, user, action, note = "") {
  ticket.activityLog.push({
    action,
    performedBy: user ? user._id : null,
    role: user ? user.role : null,
    note,
    timestamp: new Date(),
  });
}

/* Helper function for notification model */
async function notifyUsers(recipients = [], payload = {}) {
  const uniqueRecipients = [
    ...new Set(
      recipients
        .filter(Boolean)
        .map((id) => id.toString())
    ),
  ];

  if (!uniqueRecipients.length) return;

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      createNotification({
        recipient,
        sender: payload.sender || null,
        ticket: payload.ticket || null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
      })
    )
  );
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

    const attachments = [];

    if (req.file) {
      attachments.push({
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user._id,
        role: req.user.role,
        uploadedAt: new Date(),
      });
    }

    const initialNote = req.file
      ? `Ticket created with attachment: ${req.file.originalname}`
      : "Ticket created";

    const ticket = await Ticket.create({
      title: title.trim(),
      description: description.trim(),
      requestType,
      requestedChanges: requestedChanges || {},
      priority: priority || "MEDIUM",
      createdBy: req.user._id,
      status: "PENDING_HR",
      attachments,
      activityLog: [
        {
          action: "CREATED",
          performedBy: req.user._id,
          role: req.user.role,
          note: initialNote,
          timestamp: new Date(),
        },
      ],
    });

    const hrUsers = await User.find({ role: "HR" }).select("_id");

    await notifyUsers(
      hrUsers.map((user) => user._id),
      {
        sender: req.user._id,
        ticket: ticket._id,
        type: "TICKET_CREATED",
        title: "New ticket submitted",
        message: `${req.user.name} submitted a new ticket: ${ticket.title}`,
      }
    );

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
All roles
Get tickets with filtering, search, pagination, and sorting
EMPLOYEE only sees own tickets
HR / IT can see all tickets
*/
async function getTickets(req, res, next) {
  try {
    const {
      status,
      requestType,
      priority,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

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

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "priority",
      "status",
      "requestType",
    ];
    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const finalOrder = order === "asc" ? 1 : -1;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Ticket.countDocuments(filter);

    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .populate("activityLog.performedBy", "name email role")
      .populate("comments.createdBy", "name email role")
      .populate("attachments.uploadedBy", "name email role")
      .sort({ [finalSortBy]: finalOrder })
      .skip(skip)
      .limit(limitNumber);

    res.status(200).json({
      ok: true,
      count: tickets.length,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber < Math.ceil(total / limitNumber),
      hasPrevPage: pageNumber > 1,
      tickets,
    });
  } catch (err) {
    next(err);
  }
}

/*
Get single ticket details
EMPLOYEE can only view own tickets
HR / IT can view all tickets
*/
async function getTicketById(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email role department jobTitle location")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .populate("activityLog.performedBy", "name email role")
      .populate("comments.createdBy", "name email role")
      .populate("attachments.uploadedBy", "name email role");

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

/*
Get ticket history
EMPLOYEE can only view own ticket history
HR / IT can view all ticket history
*/
async function getTicketHistory(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .select("title status createdBy activityLog createdAt updatedAt")
      .populate("createdBy", "name email role")
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

    const history = [...(ticket.activityLog || [])].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    res.status(200).json({
      ok: true,
      ticketId: ticket._id,
      title: ticket.title,
      status: ticket.status,
      createdBy: ticket.createdBy,
      historyCount: history.length,
      history,
    });
  } catch (err) {
    next(err);
  }
}

/*
EMPLOYEE
Resubmit rejected ticket
*/
async function resubmitRejectedTicket(req, res, next) {
  try {
    const { title, description, requestType, priority, requestedChanges } =
      req.body || {};

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

    const hrUsers = await User.find({ role: "HR" }).select("_id");

    await notifyUsers(
      hrUsers.map((user) => user._id),
      {
        sender: req.user._id,
        ticket: ticket._id,
        type: "TICKET_RESUBMITTED",
        title: "Ticket resubmitted",
        message: `${req.user.name} resubmitted ticket: ${ticket.title}`,
      }
    );

    res.status(200).json({
      ok: true,
      message: "Ticket resubmitted successfully",
      ticket,
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
    const ticket = await Ticket.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

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

    await createNotification({
      recipient: ticket.createdBy._id,
      sender: req.user._id,
      ticket: ticket._id,
      type: "TICKET_APPROVED",
      title: "Ticket approved",
      message: `HR approved your ticket: ${ticket.title}`,
    });

    
    const itRelevantTypes = [
      "TECH_SUPPORT",
      "ASSET_REQUEST",
      "ACCESS_REQUEST",
      "ASSET_ASSIGNMENT",
      "ASSET_UNASSIGNMENT",
      "ACCOUNT_UPDATE",
      "ACCOUNT_DELETION",
      "OTHER",
    ];

    if (itRelevantTypes.includes(ticket.requestType)) {
      const itUsers = await User.find({ role: "IT" }).select("_id");

      await notifyUsers(
        itUsers.map((user) => user._id),
        {
          sender: req.user._id,
          ticket: ticket._id,
          type: "TICKET_APPROVED",
          title: "New IT ticket approved",
          message: `HR approved a ticket for IT action: ${ticket.title}`,
        }
      );
    }

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

    const ticket = await Ticket.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

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

    await createNotification({
      recipient: ticket.createdBy._id,
      sender: req.user._id,
      ticket: ticket._id,
      type: "TICKET_REJECTED",
      title: "Ticket rejected",
      message: `HR rejected your ticket: ${ticket.title}`,
    });

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
    const ticket = await Ticket.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

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
      "TECH_SUPPORT",
      "ASSET_REQUEST",
      "ACCESS_REQUEST",
      "ASSET_ASSIGNMENT",
      "ASSET_UNASSIGNMENT",
      "ACCOUNT_UPDATE",
      "ACCOUNT_DELETION",
      "OTHER",
    ];

    if (!allowedTypes.includes(ticket.requestType)) {
      res.status(400);
      throw new Error("This ticket type cannot be processed by IT");
    }

    ticket.status = "IN_PROGRESS_BY_IT";
    ticket.itHandledBy = req.user._id;

    pushActivity(ticket, req.user, "STARTED_BY_IT", "Ticket work started by IT");

    await ticket.save();

    await createNotification({
      recipient: ticket.createdBy._id,
      sender: req.user._id,
      ticket: ticket._id,
      type: "TICKET_STARTED",
      title: "IT started your ticket",
      message: `IT started working on your ticket: ${ticket.title}`,
    });

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

    const ticket = await Ticket.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

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

    await createNotification({
      recipient: ticket.createdBy._id,
      sender: req.user._id,
      ticket: ticket._id,
      type: "TICKET_RESOLVED",
      title: "Ticket resolved",
      message: `IT resolved your ticket: ${ticket.title}`,
    });

    const hrUsers = await User.find({ role: "HR" }).select("_id");

    await notifyUsers(
      hrUsers.map((user) => user._id),
      {
        sender: req.user._id,
        ticket: ticket._id,
        type: "TICKET_RESOLVED",
        title: "Ticket resolved by IT",
        message: `IT resolved ticket: ${ticket.title}`,
      }
    );

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
      const { employeeId, name, email, department, jobTitle, location } = changes;

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

      await Ticket.deleteMany({
        createdBy: employee._id,
        _id: { $ne: ticket._id },
      });
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

    const populatedTicket = await Ticket.findById(ticket._id).populate(
      "createdBy",
      "name email role"
    );

    await createNotification({
      recipient: populatedTicket.createdBy._id,
      sender: req.user._id,
      ticket: populatedTicket._id,
      type: "TICKET_EXECUTED",
      title: "Ticket executed and resolved",
      message: `IT executed and resolved your ticket: ${populatedTicket.title}`,
    });

    const hrUsers = await User.find({ role: "HR" }).select("_id");

    await notifyUsers(
      hrUsers.map((user) => user._id),
      {
        sender: req.user._id,
        ticket: populatedTicket._id,
        type: "TICKET_EXECUTED",
        title: "Ticket executed by IT",
        message: `IT executed and resolved ticket: ${populatedTicket.title}`,
      }
    );

    res.status(200).json({
      ok: true,
      message: "Ticket executed and resolved successfully",
      ticket: populatedTicket,
    });
  } catch (err) {
    next(err);
  }
}

/*
Dashboard summary counts
*/
async function getTicketDashboardSummary(req, res, next) {
  try {
    const filter = {};

    if (req.user.role === "EMPLOYEE") {
      filter.createdBy = req.user._id;
    }

    const [
      pendingHr,
      approvedByHr,
      inProgressByIt,
      resolved,
      rejectedByHr,
    ] = await Promise.all([
      Ticket.countDocuments({ ...filter, status: "PENDING_HR" }),
      Ticket.countDocuments({ ...filter, status: "APPROVED_BY_HR" }),
      Ticket.countDocuments({ ...filter, status: "IN_PROGRESS_BY_IT" }),
      Ticket.countDocuments({ ...filter, status: "RESOLVED" }),
      Ticket.countDocuments({ ...filter, status: "REJECTED_BY_HR" }),
    ]);

    res.status(200).json({
      ok: true,
      summary: {
        pendingHr,
        approvedByHr,
        inProgressByIt,
        resolved,
        rejectedByHr,
      },
    });
  } catch (err) {
    next(err);
  }
}

/*
HR queue
*/
async function getHRQueue(req, res, next) {
  try {
    const pending = await Ticket.find({ status: "PENDING_HR" })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    const approved = await Ticket.find({ status: "APPROVED_BY_HR" })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    const rejected = await Ticket.find({ status: "REJECTED_BY_HR" })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    const resolved = await Ticket.find({ status: "RESOLVED" })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      queue: {
        pending,
        approved,
        rejected,
        resolved,
      },
    });
  } catch (err) {
    next(err);
  }
}

/*
IT queue
*/
async function getITQueue(req, res, next) {
  try {
    const approved = await Ticket.find({
      status: "APPROVED_BY_HR",
      requestType: {
        $in: [
          "TECH_SUPPORT",
          "ASSET_REQUEST",
          "ACCESS_REQUEST",
          "ASSET_ASSIGNMENT",
          "ASSET_UNASSIGNMENT",
          "ACCOUNT_UPDATE",
          "ACCOUNT_DELETION",
          "OTHER",
        ],
      },
    })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    const inProgress = await Ticket.find({ status: "IN_PROGRESS_BY_IT" })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    const resolved = await Ticket.find({ status: "RESOLVED" })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      queue: {
        approved,
        inProgress,
        resolved,
      },
    });
  } catch (err) {
    next(err);
  }
}

/*
EMPLOYEE open and closed tickets
*/
async function getMyOpenTickets(req, res, next) {
  try {
    const openTickets = await Ticket.find({
      createdBy: req.user._id,
      status: { $in: ["PENDING_HR", "APPROVED_BY_HR", "IN_PROGRESS_BY_IT"] },
    })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    const closedTickets = await Ticket.find({
      createdBy: req.user._id,
      status: { $in: ["RESOLVED", "REJECTED_BY_HR"] },
    })
      .populate("createdBy", "name email role")
      .populate("hrReviewedBy", "name email role")
      .populate("itHandledBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      tickets: {
        open: openTickets,
        closed: closedTickets,
      },
    });
  } catch (err) {
    next(err);
  }
}

/*
Add ticket comment
*/
async function addTicketComment(req, res, next) {
  try {
    const { message } = req.body || {};

    if (!message || !message.trim()) {
      res.status(400);
      throw new Error("Comment message is required");
    }

    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email role");

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (
      req.user.role === "EMPLOYEE" &&
      ticket.createdBy._id.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error("You can only comment on your own tickets");
    }

    ticket.comments.push({
      message: message.trim(),
      createdBy: req.user._id,
      role: req.user.role,
      createdAt: new Date(),
    });

    pushActivity(ticket, req.user, "COMMENT_ADDED", message.trim());

    await ticket.save();

    const recipients = [];

    if (ticket.createdBy?._id?.toString() !== req.user._id.toString()) {
      recipients.push(ticket.createdBy._id);
    }

    if (ticket.hrReviewedBy && ticket.hrReviewedBy.toString() !== req.user._id.toString()) {
      recipients.push(ticket.hrReviewedBy);
    }

    if (ticket.itHandledBy && ticket.itHandledBy.toString() !== req.user._id.toString()) {
      recipients.push(ticket.itHandledBy);
    }

    await notifyUsers(recipients, {
      sender: req.user._id,
      ticket: ticket._id,
      type: "COMMENT_ADDED",
      title: "New ticket comment",
      message: `${req.user.name} commented on ticket: ${ticket.title}`,
    });

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("comments.createdBy", "name email role")
      .populate("activityLog.performedBy", "name email role");

    res.status(200).json({
      ok: true,
      message: "Comment added successfully",
      comments: updatedTicket.comments,
    });
  } catch (err) {
    next(err);
  }
}

/*
Get ticket comments
*/
async function getTicketComments(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .select("createdBy comments")
      .populate("createdBy", "name email role")
      .populate("comments.createdBy", "name email role");

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

    const comments = [...(ticket.comments || [])].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.status(200).json({
      ok: true,
      count: comments.length,
      comments,
    });
  } catch (err) {
    next(err);
  }
}

/*
Add ticket attachment
*/
async function addTicketAttachment(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email role");

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (
      req.user.role === "EMPLOYEE" &&
      ticket.createdBy._id.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error("You can only upload attachments to your own tickets");
    }

    if (!req.file) {
      res.status(400);
      throw new Error("Attachment file is required");
    }

    ticket.attachments.push({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: `/uploads/tickets/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      role: req.user.role,
      uploadedAt: new Date(),
    });

    pushActivity(
      ticket,
      req.user,
      "ATTACHMENT_ADDED",
      `Attachment uploaded: ${req.file.originalname}`
    );

    await ticket.save();

    const recipients = [];

    if (ticket.createdBy?._id?.toString() !== req.user._id.toString()) {
      recipients.push(ticket.createdBy._id);
    }

    if (ticket.hrReviewedBy && ticket.hrReviewedBy.toString() !== req.user._id.toString()) {
      recipients.push(ticket.hrReviewedBy);
    }

    if (ticket.itHandledBy && ticket.itHandledBy.toString() !== req.user._id.toString()) {
      recipients.push(ticket.itHandledBy);
    }

    await notifyUsers(recipients, {
      sender: req.user._id,
      ticket: ticket._id,
      type: "ATTACHMENT_ADDED",
      title: "New ticket attachment",
      message: `${req.user.name} added an attachment to ticket: ${ticket.title}`,
    });

    const updatedTicket = await Ticket.findById(ticket._id)
      .select("attachments")
      .populate("attachments.uploadedBy", "name email role");

    res.status(200).json({
      ok: true,
      message: "Attachment uploaded successfully",
      attachments: updatedTicket.attachments,
    });
  } catch (err) {
    next(err);
  }
}

/*
Get ticket attachments
*/
async function getTicketAttachments(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .select("createdBy attachments")
      .populate("createdBy", "name email role")
      .populate("attachments.uploadedBy", "name email role");

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

    const attachments = [...(ticket.attachments || [])].sort(
      (a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt)
    );

    res.status(200).json({
      ok: true,
      count: attachments.length,
      attachments,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};