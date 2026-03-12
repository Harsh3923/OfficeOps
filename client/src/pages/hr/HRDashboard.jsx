import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import "../../styles/dashboard.css";
import "../../styles/hrDashboard.css";

const NOTIFICATION_SEEN_KEY = "officeops_hr_notifications_seen_at";

const STATUS_FILTER_OPTIONS = [
  "ALL",
  "PENDING_HR",
  "APPROVED_BY_HR",
  "REJECTED_BY_HR",
  "RESOLVED",
];

const PRIORITY_FILTER_OPTIONS = ["ALL", "LOW", "MEDIUM", "HIGH"];

function formatStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getStatusClass(status) {
  switch (status) {
    case "PENDING_HR":
      return "status-pill status-pending";
    case "APPROVED_BY_HR":
      return "status-pill status-approved";
    case "IN_PROGRESS_BY_IT":
      return "status-pill status-progress";
    case "RESOLVED":
      return "status-pill status-resolved";
    case "REJECTED_BY_HR":
      return "status-pill status-rejected";
    default:
      return "status-pill";
  }
}

function matchesFilters(ticket, searchTerm, statusFilter, priorityFilter) {
  const haystack = `
    ${ticket.title || ""}
    ${ticket.description || ""}
    ${ticket.requestType || ""}
    ${ticket.priority || ""}
    ${ticket.status || ""}
    ${ticket.createdBy?.name || ""}
    ${ticket.createdBy?.email || ""}
  `
    .toLowerCase()
    .trim();

  const searchMatch = haystack.includes(searchTerm.toLowerCase());
  const statusMatch = statusFilter === "ALL" ? true : ticket.status === statusFilter;
  const priorityMatch =
    priorityFilter === "ALL" ? true : ticket.priority === priorityFilter;

  return searchMatch && statusMatch && priorityMatch;
}

export default function HRDashboard() {
  const [queue, setQueue] = useState({
    pending: [],
    approved: [],
    rejected: [],
    resolved: [],
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  const [reviewTicket, setReviewTicket] = useState(null);
  const [reviewAction, setReviewAction] = useState("approve");
  const [reviewComment, setReviewComment] = useState("");

  const [seenNotificationsAt, setSeenNotificationsAt] = useState(() => {
    return localStorage.getItem(NOTIFICATION_SEEN_KEY) || "";
  });

  const ticketSectionRef = useRef(null);

  async function fetchQueue() {
    try {
      setLoading(true);
      setError("");

      const [queueRes, employeesRes] = await Promise.all([
        api.get("/tickets/hr/queue"),
        api.get("/employees"),
      ]);

      setQueue(
        queueRes?.data?.queue || {
          pending: [],
          approved: [],
          rejected: [],
          resolved: [],
        }
      );

      setEmployees(
        Array.isArray(employeesRes?.data?.employees) ? employeesRes.data.employees : []
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load HR dashboard.");
      setQueue({
        pending: [],
        approved: [],
        rejected: [],
        resolved: [],
      });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (selectedTicket || reviewTicket || showNotificationsPanel) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => document.body.classList.remove("modal-open");
  }, [selectedTicket, reviewTicket, showNotificationsPanel]);

  const pendingTickets = queue.pending || [];
  const approvedTickets = queue.approved || [];
  const rejectedTickets = queue.rejected || [];
  const resolvedTickets = queue.resolved || [];

  const allTickets = useMemo(() => {
    return [...pendingTickets, ...approvedTickets, ...rejectedTickets, ...resolvedTickets];
  }, [pendingTickets, approvedTickets, rejectedTickets, resolvedTickets]);

  const totalTickets = allTickets.length;
  const totalPending = pendingTickets.length;
  const totalApproved = approvedTickets.length;
  const totalRejected = rejectedTickets.length;
  const totalResolved = resolvedTickets.length;

  const filteredPending = useMemo(() => {
    return pendingTickets.filter((ticket) =>
      matchesFilters(ticket, searchTerm, statusFilter, priorityFilter)
    );
  }, [pendingTickets, searchTerm, statusFilter, priorityFilter]);

  const filteredApproved = useMemo(() => {
    return approvedTickets.filter((ticket) =>
      matchesFilters(ticket, searchTerm, statusFilter, priorityFilter)
    );
  }, [approvedTickets, searchTerm, statusFilter, priorityFilter]);

  const filteredRejected = useMemo(() => {
    return rejectedTickets.filter((ticket) =>
      matchesFilters(ticket, searchTerm, statusFilter, priorityFilter)
    );
  }, [rejectedTickets, searchTerm, statusFilter, priorityFilter]);

  const filteredResolved = useMemo(() => {
    return resolvedTickets.filter((ticket) =>
      matchesFilters(ticket, searchTerm, statusFilter, priorityFilter)
    );
  }, [resolvedTickets, searchTerm, statusFilter, priorityFilter]);

  const currentRows = useMemo(() => {
    if (activeTab === "pending") return filteredPending;
    if (activeTab === "approved") return filteredApproved;
    if (activeTab === "rejected") return filteredRejected;
    return filteredResolved;
  }, [activeTab, filteredPending, filteredApproved, filteredRejected, filteredResolved]);

  const recentActivity = useMemo(() => {
    const items = [];

    allTickets.forEach((ticket) => {
      if (Array.isArray(ticket.activityLog) && ticket.activityLog.length) {
        ticket.activityLog.forEach((entry) => {
          items.push({
            ticketId: ticket._id,
            ticketTitle: ticket.title,
            action: entry.action || "Updated",
            note: entry.note || "",
            role: entry.role || entry.performedBy?.role || "System",
            timestamp: entry.timestamp || ticket.updatedAt || ticket.createdAt,
          });
        });
      } else {
        items.push({
          ticketId: ticket._id,
          ticketTitle: ticket.title,
          action: "CREATED",
          note: ticket.description || "",
          role: "Employee",
          timestamp: ticket.createdAt,
        });
      }
    });

    return items
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 7);
  }, [allTickets]);

  const notificationItems = useMemo(() => {
    return pendingTickets
      .slice()
      .sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      )
      .slice(0, 6)
      .map((ticket) => ({
        id: ticket._id,
        title: ticket.title,
        message: `${ticket.createdBy?.name || "Employee"} submitted a ticket`,
        time: ticket.updatedAt || ticket.createdAt,
      }));
  }, [pendingTickets]);

  const unreadNotificationCount = useMemo(() => {
    if (!seenNotificationsAt) return notificationItems.length;

    return notificationItems.filter(
      (item) => new Date(item.time) > new Date(seenNotificationsAt)
    ).length;
  }, [notificationItems, seenNotificationsAt]);

  function handleNotificationClick() {
    const now = new Date().toISOString();
    localStorage.setItem(NOTIFICATION_SEEN_KEY, now);
    setSeenNotificationsAt(now);
    setShowNotificationsPanel((prev) => !prev);
  }

  function scrollToTicketSection(tab = "pending") {
    setActiveTab(tab);

    requestAnimationFrame(() => {
      ticketSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleViewDetails(ticketId) {
    try {
      setDetailsLoading(true);
      setError("");

      const { data } = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(data?.ticket || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load ticket details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetailsModal() {
    setSelectedTicket(null);
  }

  function openReviewModal(ticket, actionType) {
    setReviewTicket(ticket);
    setReviewAction(actionType);
    setReviewComment(actionType === "reject" ? "" : ticket.hrComment || "");
    setError("");
    setSuccess("");
  }

  function closeReviewModal() {
    setReviewTicket(null);
    setReviewAction("approve");
    setReviewComment("");
  }

  function openReviewFromDetails(actionType) {
    if (!selectedTicket) return;

    const ticketToReview = selectedTicket;
    setSelectedTicket(null);

    setTimeout(() => {
      setReviewTicket(ticketToReview);
      setReviewAction(actionType);
      setReviewComment(actionType === "reject" ? "" : ticketToReview.hrComment || "");
      setError("");
      setSuccess("");
    }, 0);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();

    if (!reviewTicket?._id) return;

    if (reviewAction === "reject" && !reviewComment.trim()) {
      setError("Please add a reason before rejecting the ticket.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (reviewAction === "approve") {
        await api.patch(`/tickets/${reviewTicket._id}/approve`, {
          hrComment: reviewComment.trim(),
        });
        setSuccess("Ticket approved successfully.");
      } else {
        await api.patch(`/tickets/${reviewTicket._id}/reject`, {
          hrComment: reviewComment.trim(),
        });
        setSuccess("Ticket rejected successfully.");
      }

      const targetTab = reviewAction === "approve" ? "approved" : "rejected";

      closeReviewModal();
      await fetchQueue();
      scrollToTicketSection(targetTab);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to process ticket.");
    } finally {
      setActionLoading(false);
    }
  }

  function TicketTable({ rows, emptyText }) {
    if (loading) {
      return <div className="dashboard-empty">Loading HR queue...</div>;
    }

    if (!rows.length) {
      return <div className="dashboard-empty">{emptyText}</div>;
    }

    return (
      <div className="table-wrap">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Employee</th>
              <th>Request Type</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ticket) => (
              <tr key={ticket._id}>
                <td className="ticket-title-cell">
                  <button
                    className="ticket-title-link"
                    type="button"
                    onClick={() => handleViewDetails(ticket._id)}
                  >
                    {ticket.title}
                  </button>
                </td>

                <td>
                  <div style={{ display: "grid", gap: "2px" }}>
                    <strong>{ticket.createdBy?.name || "-"}</strong>
                    <span style={{ fontSize: "12px", color: "#667085" }}>
                      {ticket.createdBy?.email || "-"}
                    </span>
                  </div>
                </td>

                <td>{formatStatus(ticket.requestType)}</td>

                <td>
                  <span className={getStatusClass(ticket.status)}>
                    {formatStatus(ticket.status)}
                  </span>
                </td>

                <td>{formatStatus(ticket.priority)}</td>
                <td>{formatDate(ticket.createdAt)}</td>

                <td>
                  <button
                    className="table-action-btn action-view-btn"
                    onClick={() => handleViewDetails(ticket._id)}
                    type="button"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <Navbar
        notificationCount={unreadNotificationCount}
        onNotificationClick={handleNotificationClick}
      />

      <div className="hr-page">
        <section className="hero-card">
          <div>
            <p className="eyebrow">OfficeOps HR Portal</p>
            <h1>HR Dashboard</h1>
            <p className="hero-subtext">
              Review incoming employee requests, approve or reject tickets, monitor
              workflow health, and keep full visibility across the HR queue.
            </p>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" type="button" onClick={fetchQueue}>
              Refresh Queue
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => scrollToTicketSection("pending")}
            >
              Review Pending ({totalPending})
            </button>
          </div>
        </section>

        {error ? <div className="error-box dashboard-message">{error}</div> : null}
        {success ? <div className="success-box dashboard-message">{success}</div> : null}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">All Tickets</span>
            <h3>{totalTickets}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-label">Pending HR</span>
            <h3>{totalPending}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-label">Approved</span>
            <h3>{totalApproved}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-label">Resolved</span>
            <h3>{totalResolved}</h3>
          </div>
        </section>

        <div className="employee-layout">
          <main className="employee-main">
            <section className="quick-actions-grid">
              <button
                className="quick-card"
                type="button"
                onClick={() => scrollToTicketSection("pending")}
              >
                <div>
                  <h3>Pending Review</h3>
                  <p>Handle tickets waiting for HR decision.</p>
                </div>
                <span>{totalPending}</span>
              </button>

              <button
                className="quick-card"
                type="button"
                onClick={() => scrollToTicketSection("approved")}
              >
                <div>
                  <h3>Approved Queue</h3>
                  <p>Track tickets already forwarded after approval.</p>
                </div>
                <span>{totalApproved}</span>
              </button>

              <button
                className="quick-card"
                type="button"
                onClick={() => scrollToTicketSection("resolved")}
              >
                <div>
                  <h3>Resolved History</h3>
                  <p>Review completed requests and outcomes.</p>
                </div>
                <span>{totalResolved}</span>
              </button>
            </section>

            <section className="panel-card" ref={ticketSectionRef}>
              <div className="panel-header panel-header-wrap">
                <div className="tabs">
                  <button
                    className={activeTab === "pending" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("pending")}
                    type="button"
                  >
                    Pending
                  </button>
                  <button
                    className={activeTab === "approved" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("approved")}
                    type="button"
                  >
                    Approved
                  </button>
                  <button
                    className={activeTab === "rejected" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("rejected")}
                    type="button"
                  >
                    Rejected
                  </button>
                  <button
                    className={activeTab === "resolved" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("resolved")}
                    type="button"
                  >
                    Resolved
                  </button>
                </div>

                <div className="filters-row">
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search tickets, employee, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_FILTER_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === "ALL" ? "All Statuses" : formatStatus(status)}
                      </option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    {PRIORITY_FILTER_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority === "ALL" ? "All Priorities" : formatStatus(priority)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTab === "pending" ? (
                <TicketTable rows={currentRows} emptyText="No pending HR tickets found." />
              ) : null}

              {activeTab === "approved" ? (
                <TicketTable rows={currentRows} emptyText="No approved tickets found." />
              ) : null}

              {activeTab === "rejected" ? (
                <TicketTable rows={currentRows} emptyText="No rejected tickets found." />
              ) : null}

              {activeTab === "resolved" ? (
                <TicketTable rows={currentRows} emptyText="No resolved tickets found." />
              ) : null}
            </section>
          </main>

          <aside className="employee-sidebar">
            <section className="side-card">
              <div className="side-card-header">
                <h3>Queue Snapshot</h3>
                <button className="text-btn" onClick={fetchQueue} type="button">
                  Refresh
                </button>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <strong>{totalPending} Pending</strong>
                  <p>Tickets currently waiting for HR action.</p>
                </div>
                <div className="activity-item">
                  <strong>{totalApproved} Approved</strong>
                  <p>Tickets already reviewed and moved forward.</p>
                </div>
                <div className="activity-item">
                  <strong>{totalRejected} Rejected</strong>
                  <p>Requests sent back with HR comments.</p>
                </div>
                <div className="activity-item">
                  <strong>{employees.length} Employees</strong>
                  <p>Total employee accounts visible to HR.</p>
                </div>
              </div>
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <h3>Recent Activity</h3>
                <button className="text-btn" onClick={fetchQueue} type="button">
                  Refresh
                </button>
              </div>

              {recentActivity.length ? (
                <div className="activity-list">
                  {recentActivity.map((item, index) => (
                    <button
                      key={`${item.ticketId}-${item.timestamp}-${index}`}
                      className="activity-item"
                      type="button"
                      onClick={() => handleViewDetails(item.ticketId)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{formatStatus(item.action)}</strong>
                      <p>{item.ticketTitle}</p>
                      <span>
                        {item.role} • {formatDate(item.timestamp)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty small-empty">No recent activity yet.</div>
              )}
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <h3>Employee Directory</h3>
              </div>

              {employees.length ? (
                <div className="activity-list">
                  {employees.slice(0, 6).map((employee) => (
                    <div key={employee._id} className="activity-item">
                      <strong>{employee.name}</strong>
                      <p>{employee.email}</p>
                      <span>
                        {employee.department || "No department"} •{" "}
                        {employee.jobTitle || "No title"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty small-empty">No employees found.</div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {showNotificationsPanel ? (
        <div
          className="notification-panel-overlay"
          onClick={() => setShowNotificationsPanel(false)}
        >
          <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
            <div className="notification-top">
              <h3>Pending Notifications</h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowNotificationsPanel(false)}
              >
                ×
              </button>
            </div>

            {notificationItems.length ? (
              <div className="notification-list">
                {notificationItems.map((item) => (
                  <button
                    key={item.id}
                    className="notification-item"
                    type="button"
                    onClick={() => {
                      setShowNotificationsPanel(false);
                      handleViewDetails(item.id);
                    }}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <span>{formatDate(item.time)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty small-empty">
                No new HR notifications right now.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {reviewTicket ? (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div className="modal-card clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">HR Review</p>
                <h2>{reviewAction === "approve" ? "Approve Ticket" : "Reject Ticket"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeReviewModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="description-box" style={{ marginBottom: "16px" }}>
                <span>Ticket</span>
                <p>
                  <strong>{reviewTicket.title}</strong>
                  <br />
                  {reviewTicket.createdBy?.name || "-"} •{" "}
                  {formatStatus(reviewTicket.requestType)} •{" "}
                  {formatStatus(reviewTicket.priority)}
                </p>
              </div>

              <label className="field-label">
                {reviewAction === "approve" ? "HR Comment (optional)" : "Rejection Reason"}
              </label>

              <textarea
                className="field-input"
                rows="5"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  reviewAction === "approve"
                    ? "Add an optional note for the employee or IT team"
                    : "Explain why this request is being rejected"
                }
                required={reviewAction === "reject"}
              />

              <div className="modal-actions">
                <button className="ghost-btn" type="button" onClick={closeReviewModal}>
                  Cancel
                </button>
                <button className="primary-btn" type="submit" disabled={actionLoading}>
                  {actionLoading
                    ? "Processing..."
                    : reviewAction === "approve"
                    ? "Approve Ticket"
                    : "Reject Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedTicket || detailsLoading ? (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div
            className="modal-card clean-modal details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {detailsLoading ? (
              <div className="dashboard-empty">Loading details...</div>
            ) : selectedTicket ? (
              <>
                <div className="modal-top">
                  <div>
                    <p className="eyebrow">Ticket Details</p>
                    <h2>{selectedTicket.title}</h2>
                  </div>
                  <button className="modal-close" onClick={closeDetailsModal} type="button">
                    ×
                  </button>
                </div>

                <div className="details-grid">
                  <div className="detail-item">
                    <span>Status</span>
                    <strong className={getStatusClass(selectedTicket.status)}>
                      {formatStatus(selectedTicket.status)}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Request Type</span>
                    <strong>{formatStatus(selectedTicket.requestType)}</strong>
                  </div>

                  <div className="detail-item">
                    <span>Priority</span>
                    <strong>{formatStatus(selectedTicket.priority)}</strong>
                  </div>

                  <div className="detail-item">
                    <span>Created</span>
                    <strong>{formatDate(selectedTicket.createdAt)}</strong>
                  </div>
                </div>

                <div className="description-box">
                  <span>Description</span>
                  <p>{selectedTicket.description}</p>
                </div>

                {selectedTicket.createdBy ? (
                  <div className="description-box">
                    <span>Employee</span>
                    <p>
                      <strong>{selectedTicket.createdBy.name}</strong>
                      <br />
                      {selectedTicket.createdBy.email}
                      <br />
                      {selectedTicket.createdBy.department || "No department"} •{" "}
                      {selectedTicket.createdBy.jobTitle || "No title"}
                      <br />
                      {selectedTicket.createdBy.location || "No location"}
                    </p>
                  </div>
                ) : null}

                {selectedTicket.hrReviewedBy ? (
                  <div className="description-box">
                    <span>Reviewed By</span>
                    <p>
                      {selectedTicket.hrReviewedBy.name} •{" "}
                      {selectedTicket.hrReviewedBy.email}
                    </p>
                  </div>
                ) : null}

                {selectedTicket.hrComment ? (
                  <div className="description-box">
                    <span>HR Comment</span>
                    <p>{selectedTicket.hrComment}</p>
                  </div>
                ) : null}

                {selectedTicket.resolutionNote ? (
                  <div className="description-box">
                    <span>Resolution Note</span>
                    <p>{selectedTicket.resolutionNote}</p>
                  </div>
                ) : null}

                {Array.isArray(selectedTicket.attachments) &&
                selectedTicket.attachments.length ? (
                  <div className="description-box">
                    <span>Attachments</span>
                    <div className="attachments-list">
                      {selectedTicket.attachments.map((file, index) => (
                        <a
                          key={`${file.fileName}-${index}`}
                          href={`http://localhost:5000/${String(file.filePath).replaceAll(
                            "\\",
                            "/"
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="attachment-link"
                        >
                          {file.originalName}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {Array.isArray(selectedTicket.activityLog) &&
                selectedTicket.activityLog.length ? (
                  <div className="activity-section">
                    <h3>Activity Log</h3>
                    <div className="activity-list">
                      {selectedTicket.activityLog.map((item, index) => (
                        <div key={`${item.timestamp}-${index}`} className="activity-item">
                          <strong>{formatStatus(item.action)}</strong>
                          <p>{item.note || "-"}</p>
                          <span>
                            {(item.performedBy?.name || item.role || "System")} •{" "}
                            {formatDate(item.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTicket.status === "PENDING_HR" ? (
                  <div className="ticket-review-actions">
                    <button
                      className="table-action-btn action-reject-btn"
                      type="button"
                      onClick={() => openReviewFromDetails("reject")}
                    >
                      Reject Ticket
                    </button>

                    <button
                      className="table-action-btn action-approve-btn"
                      type="button"
                      onClick={() => openReviewFromDetails("approve")}
                    >
                      Approve Ticket
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}