const mongoose = require("mongoose");

const ticketActivitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    role: {
      type: String,
      enum: ["HR", "IT", "EMPLOYEE"],
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    requestType: {
      type: String,
      enum: [
        "TECH_SUPPORT",
        "ASSET_REQUEST",
        "ACCOUNT_UPDATE",
        "ACCOUNT_DELETION",
        "ACCESS_REQUEST",
        "ASSET_ASSIGNMENT",
        "ASSET_UNASSIGNMENT",
        "OTHER",
      ],
      required: [true, "Request type is required"],
    },
    status: {
      type: String,
      enum: [
        "PENDING_HR",
        "REJECTED_BY_HR",
        "APPROVED_BY_HR",
        "IN_PROGRESS_BY_IT",
        "RESOLVED",
      ],
      default: "PENDING_HR",
    },
    requestedChanges: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hrReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    itHandledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    hrComment: {
      type: String,
      trim: true,
      default: "",
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: "",
    },
    activityLog: {
      type: [ticketActivitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;