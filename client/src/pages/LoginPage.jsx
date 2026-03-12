import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  function getRole(payload) {
    return String(payload?.role || payload?.user?.role || "").toUpperCase();
  }

  if (!authLoading && user) {
    const role = getRole(user);

    if (role === "EMPLOYEE") return <Navigate to="/employee" replace />;
    if (role === "HR") return <Navigate to="/hr" replace />;
    if (role === "IT") return <Navigate to="/it" replace />;
  }

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
    setShowForgotPassword(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setShowForgotPassword(false);
    setLoading(true);

    try {
      const loggedInUser = await login(formData);
      const role = getRole(loggedInUser);

      if (role === "EMPLOYEE") navigate("/employee");
      else if (role === "HR") navigate("/hr");
      else if (role === "IT") navigate("/it");
      else navigate("/unauthorized");
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message || "Login failed. Please try again.";
      const backendCode = err?.response?.data?.code || "";

      setError(backendMessage);

      if (backendCode === "INVALID_PASSWORD") {
        setShowForgotPassword(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    navigate("/forgot-password", {
      state: { email: formData.email },
    });
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>OfficeOps Login</h1>
        <p>Sign in to access your dashboard</p>

        {error && <div className="error-box">{error}</div>}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>

        {showForgotPassword && (
          <button
            type="button"
            className="forgot-password-btn"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <button
          type="button"
          className="btn btn-secondary full-width"
          onClick={() => navigate("/signup")}
          style={{ marginTop: "12px" }}
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}