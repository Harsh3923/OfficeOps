import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const RESEND_COOLDOWN = 30;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const initialMessage = location.state?.message || "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
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

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setVerifyLoading(true);

    try {
      const { data } = await api.post("/auth/password-reset/verify", {
        email,
        code,
      });

      setIsCodeVerified(true);
      setMessage(data?.message || "Verification code accepted.");
    } catch (err) {
      setError(err?.response?.data?.message || "Code verification failed.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/password-reset/confirm", {
        email,
        newPassword,
        confirmNewPassword,
      });

      setMessage(data?.message || "Password reset successful.");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;

    setError("");
    setMessage("");
    setResendLoading(true);

    try {
      const { data } = await api.post("/auth/password-reset/resend", { email });
      setMessage(data?.message || "A new reset code has been sent.");
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend reset code.");
    } finally {
      setResendLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="center-screen">
        <div className="simple-card">
          <h2>Missing reset details</h2>
          <p>Please start the forgot password process again.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/forgot-password")}
          >
            Go to Forgot Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {!isCodeVerified ? (
        <form className="auth-card" onSubmit={handleVerifyCode}>
          <h1>Verify Reset Code</h1>
          <p>Enter the password reset code sent to {email}</p>

          {error && <div className="error-box">{error}</div>}
          {message && <div className="success-box">{message}</div>}

          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Enter reset code"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={verifyLoading}
          >
            {verifyLoading ? "Verifying..." : "Verify Code"}
          </button>

          <button
            type="button"
            className="btn btn-secondary full-width"
            style={{ marginTop: "12px" }}
            onClick={handleResendCode}
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
      ) : (
        <form className="auth-card" onSubmit={handleResetPassword}>
          <h1>Set New Password</h1>
          <p>Create a new password for {email}</p>

          {error && <div className="error-box">{error}</div>}
          {message && <div className="success-box">{message}</div>}

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter new password"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                setError("");
              }}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={loading}
          >
            {loading ? "Updating Password..." : "Reset Password"}
          </button>

          <button
            type="button"
            className="btn btn-secondary full-width"
            style={{ marginTop: "12px" }}
            onClick={() => navigate("/login")}
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
}