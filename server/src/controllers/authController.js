const bcrypt = require("bcrypt");
const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const generateVerificationCode = require("../utils/generateVerificationCode");
const sendEmail = require("../utils/sendEmail");

async function startSignup(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      res.status(400);
      throw new Error("All fields are required");
    }

    if (password !== confirmPassword) {
      res.status(400);
      throw new Error("Passwords do not match");
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400);
      throw new Error("An account with this email already exists");
    }

    const verificationCode = generateVerificationCode();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        verificationCode,
        verificationCodeExpiresAt,
        role: "EMPLOYEE",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    await sendEmail(
      normalizedEmail,
      "OfficeOps Hub Verification Code",
      `Your OfficeOps Hub verification code is ${verificationCode}. This code will expire in 10 minutes.`
    );

    res.status(200).json({
      ok: true,
      message: "Verification code sent to email",
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

async function verifySignupCode(req, res, next) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400);
      throw new Error("Email and verification code are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    if (!pendingUser) {
      res.status(404);
      throw new Error("No pending signup found for this email");
    }

    if (pendingUser.verificationCode !== code.trim()) {
      res.status(400);
      throw new Error("Invalid verification code");
    }

    if (pendingUser.verificationCodeExpiresAt < new Date()) {
      await PendingUser.deleteOne({ _id: pendingUser._id });
      res.status(400);
      throw new Error("Verification code has expired. Please sign up again");
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      await PendingUser.deleteOne({ _id: pendingUser._id });
      res.status(400);
      throw new Error("An account with this email already exists");
    }

    const newUser = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      role: pendingUser.role,
      isVerified: true,
    });

    await PendingUser.deleteOne({ _id: pendingUser._id });

    res.status(201).json({
      ok: true,
      message: "Account verified and created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
}
async function resendVerificationCode(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    if (!pendingUser) {
      res.status(404);
      throw new Error("No pending signup found for this email");
    }

    const newVerificationCode = generateVerificationCode();
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

    pendingUser.verificationCode = newVerificationCode;
    pendingUser.verificationCodeExpiresAt = newExpiry;

    await pendingUser.save();

    await sendEmail(
      normalizedEmail,
      "OfficeOps Hub Verification Code",
      `Your new OfficeOps Hub verification code is ${newVerificationCode}. This code will expire in 10 minutes.`
    );

    res.status(200).json({
      ok: true,
      message: "A new verification code has been sent",
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startSignup,
  verifySignupCode,
  resendVerificationCode,
};