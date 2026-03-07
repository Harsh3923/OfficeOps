const express = require("express");

const {
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
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Login / Logout / Current User
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

/*
POST /api/auth/signup/start
Starts signup process and sends verification email
*/
router.post("/signup/start", startSignup);

/*
POST /api/auth/signup/verify
User submits the 6-digit verification code
*/
router.post("/signup/verify", verifySignupCode);

/*
POST /api/auth/signup/resend
Resend signup verification code
*/
router.post("/signup/resend", resendVerificationCode);

/*
POST /api/auth/password-reset/start
Starts password reset and sends reset code by email
*/
router.post("/password-reset/start", startPasswordReset);

/*
POST /api/auth/password-reset/verify
Verifies password reset code
*/
router.post("/password-reset/verify", verifyPasswordResetCode);

/*
POST /api/auth/password-reset/resend
Resends password reset code
*/
router.post("/password-reset/resend", resendPasswordResetCode);

/*
POST /api/auth/password-reset/confirm
Confirms reset and saves new password
*/
router.post("/password-reset/confirm", confirmPasswordReset);

module.exports = router;