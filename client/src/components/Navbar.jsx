import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({
  notificationCount = 0,
  onNotificationClick = () => {},
}) {
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
          <button
            className="notification-bell"
            onClick={onNotificationClick}
            type="button"
            aria-label="Notifications"
          >
            <span className="bell-icon">🔔</span>
            {notificationCount > 0 ? (
              <span className="notification-badge">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            ) : null}
          </button>

          {user ? (
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
          ) : null}
        </div>
      </div>
    </nav>
  );
}