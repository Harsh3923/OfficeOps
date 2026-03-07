const bcrypt = require("bcrypt");
const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const generateVerificationCode = require("../utils/generateVerificationCode");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");
const PasswordResetRequest = require("../models/PasswordResetRequest");

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

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      ok: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  try {
    res.clearCookie("token");

    res.status(200).json({
      ok: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = req.user;

    res.status(200).json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function startPasswordReset(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404);
      throw new Error("No account found with this email");
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordResetRequest.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        verificationCode,
        verificationCodeExpiresAt,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    await sendEmail(
      normalizedEmail,
      "OfficeOps Hub Password Reset Code",
      `Your OfficeOps Hub password reset code is ${verificationCode}. This code will expire in 10 minutes.`
    );

    res.status(200).json({
      ok: true,
      message: "Password reset code sent to email",
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyPasswordResetCode(req, res, next) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      res.status(400);
      throw new Error("Email and verification code are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const resetRequest = await PasswordResetRequest.findOne({
      email: normalizedEmail,
    });

    if (!resetRequest) {
      res.status(404);
      throw new Error("No password reset request found for this email");
    }

    if (resetRequest.verificationCode !== code.trim()) {
      res.status(400);
      throw new Error("Invalid verification code");
    }

    if (resetRequest.verificationCodeExpiresAt < new Date()) {
      await PasswordResetRequest.deleteOne({ _id: resetRequest._id });
      res.status(400);
      throw new Error("Verification code has expired. Please request a new one");
    }

    res.status(200).json({
      ok: true,
      message: "Verification code accepted",
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

async function resendPasswordResetCode(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const resetRequest = await PasswordResetRequest.findOne({
      email: normalizedEmail,
    });

    if (!resetRequest) {
      res.status(404);
      throw new Error("No password reset request found for this email");
    }

    const newVerificationCode = generateVerificationCode();
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

    resetRequest.verificationCode = newVerificationCode;
    resetRequest.verificationCodeExpiresAt = newExpiry;

    await resetRequest.save();

    await sendEmail(
      normalizedEmail,
      "OfficeOps Hub Password Reset Code",
      `Your new OfficeOps Hub password reset code is ${newVerificationCode}. This code will expire in 10 minutes.`
    );

    res.status(200).json({
      ok: true,
      message: "A new password reset code has been sent",
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmPasswordReset(req, res, next) {
  try {
    const { email, newPassword, confirmNewPassword } = req.body || {};

    if (!email || !newPassword || !confirmNewPassword) {
      res.status(400);
      throw new Error("All fields are required");
    }

    if (newPassword !== confirmNewPassword) {
      res.status(400);
      throw new Error("Passwords do not match");
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404);
      throw new Error("No account found with this email");
    }

    const resetRequest = await PasswordResetRequest.findOne({
      email: normalizedEmail,
    });

    if (!resetRequest) {
      res.status(404);
      throw new Error("No password reset request found for this email");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await PasswordResetRequest.deleteOne({ _id: resetRequest._id });

    res.status(200).json({
      ok: true,
      message: "Password has been reset successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startSignup,
  verifySignupCode,
  resendVerificationCode,
  startPasswordReset,
  verifyPasswordResetCode,
  resendPasswordResetCode,
  confirmPasswordReset,
  login,
  logout,
  getMe,
};