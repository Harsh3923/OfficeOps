import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function getDashboardPath() {
    if (!user) return "/login";

    const role = String(user?.role || "").toUpperCase();

    if (role === "EMPLOYEE") return "/employee";
    if (role === "HR") return "/hr";
    if (role === "IT") return "/it";

    return "/login";
  }

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link to={getDashboardPath()} className="topbar-brand">
          <span className="brand-mark">OO</span>
          <span className="brand-text">OfficeOps</span>
        </Link>

        <div className="topbar-right">
          {user && (
            <>
              <div className="topbar-user">
                <span className="topbar-user-name">{user.name}</span>
                <span className="topbar-user-role">
                  {String(user.role || "").toUpperCase()}
                </span>
              </div>

              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}