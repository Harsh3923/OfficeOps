const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    verificationCode: {
      type: String,
      required: [true, "Verification code is required"],
    },
    verificationCodeExpiresAt: {
      type: Date,
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "IT", "EMPLOYEE"],
      default: "EMPLOYEE",
    },
  },
  {
    timestamps: true,
  }
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

module.exports = PendingUser;