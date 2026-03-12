import React from "react";
import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="center-screen">
      <div className="simple-card">
        <h2>Unauthorized</h2>
        <p>You do not have permission to view this page.</p>
        <Link to="/login" className="btn btn-primary">
          Go to Login
        </Link>
      </div>
    </div>
  );
}