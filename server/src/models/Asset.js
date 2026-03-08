const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetName: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
    },
    assetTag: {
      type: String,
      required: [true, "Asset tag is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["LAPTOP", "MONITOR", "PHONE", "TABLET", "ACCESSORY", "OTHER"],
      required: true,
    },
    serialNumber: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"],
      default: "AVAILABLE",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    condition: {
      type: String,
      enum: ["NEW", "GOOD", "FAIR", "DAMAGED"],
      default: "GOOD",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Asset = mongoose.model("Asset", assetSchema);

module.exports = Asset;