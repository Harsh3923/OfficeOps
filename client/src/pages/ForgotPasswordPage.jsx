import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/password-reset/start", { email });

      navigate("/reset-password", {
        state: {
          email,
          message: data?.message || "Password reset code sent to your email.",
        },
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to start password reset."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Forgot Password</h1>
        <p>Enter your email to receive a password reset code</p>

        {error && <div className="error-box">{error}</div>}
        {message && <div className="success-box">{message}</div>}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="Enter your email"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Sending Code..." : "Send Reset Code"}
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
    </div>
  );
}