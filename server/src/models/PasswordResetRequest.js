const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    verificationCode: {
      type: String,
      required: [true, "Verification code is required"],
    },
    verificationCodeExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const PasswordResetRequest = mongoose.model(
  "PasswordResetRequest",
  passwordResetRequestSchema
);

module.exports = PasswordResetRequest;