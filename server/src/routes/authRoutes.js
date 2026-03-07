const express = require("express");

const {
  startSignup,
  verifySignupCode,
  resendVerificationCode,
} = require("../controllers/authController");

const router = express.Router();

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
Resend verification code
*/
router.post("/signup/resend", resendVerificationCode);

module.exports = router;