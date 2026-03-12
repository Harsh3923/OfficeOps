import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const RESEND_COOLDOWN = 30;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const initialMessage = location.state?.message || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [resendCooldown, setResendCooldown] = useState(
    initialMessage ? RESEND_COOLDOWN : 0
  );

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/signup/verify", {
        email,
        code: otp,
      });

      setMessage(data?.message || "Account created successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;

    setError("");
    setMessage("");
    setResendLoading(true);

    try {
      const { data } = await api.post("/auth/signup/resend", { email });
      setMessage(data?.message || "Verification code sent again.");
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend code.");
    } finally {
      setResendLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="center-screen">
        <div className="simple-card">
          <h2>Missing signup details</h2>
          <p>Please complete signup first.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/signup")}
          >
            Go to Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleVerify}>
        <h1>Verify Your Email</h1>
        <p>Enter the verification code sent to {email}</p>

        {error && <div className="error-box">{error}</div>}
        {message && <div className="success-box">{message}</div>}

        <div className="form-group">
          <label>Verification Code</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value);
              setError("");
            }}
            placeholder="Enter OTP code"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>

        <button
          type="button"
          className="btn btn-secondary full-width"
          style={{ marginTop: "12px" }}
          onClick={handleResendOtp}
          disabled={resendLoading || resendCooldown > 0}
        >
          {resendLoading
            ? "Resending..."
            : resendCooldown > 0
            ? `Resend available in ${resendCooldown}s`
            : "Resend Code"}
        </button>

        {resendCooldown > 0 && (
          <p className="cooldown-text">
            Resend code available in: {resendCooldown}s
          </p>
        )}

        <button
          type="button"
          className="btn full-width"
          style={{ marginTop: "12px", background: "#f3f4f6", color: "#111827" }}
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}