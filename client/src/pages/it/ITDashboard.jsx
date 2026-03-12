import React from "react";
import Navbar from "../../components/Navbar";

export default function ITDashboard() {
  return (
    <>
      <Navbar />
      <div className="page">
        <h1>IT Dashboard</h1>
        <p>Welcome to the IT portal.</p>

        <div className="grid">
          <div className="card">
            <h3>IT Queue</h3>
            <p>See tickets assigned to IT for technical action.</p>
          </div>

          <div className="card">
            <h3>In Progress</h3>
            <p>Track tickets currently being worked on.</p>
          </div>

          <div className="card">
            <h3>Resolved</h3>
            <p>View completed IT work and ticket resolutions.</p>
          </div>
        </div>
      </div>
    </>
  );
}