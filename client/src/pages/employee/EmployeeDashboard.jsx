import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import "../../styles/dashboard.css";
import "../../styles/employeeDashboard.css";

const DRAFT_KEY = "officeops_employee_ticket_draft_v1";
const NOTIFICATION_SEEN_KEY = "officeops_employee_notifications_seen_at";

const REQUEST_TYPE_OPTIONS = [
  { value: "TECH_SUPPORT", label: "Tech Support" },
  { value: "ASSET_REQUEST", label: "Asset Request" },
  { value: "ACCOUNT_UPDATE", label: "Account Update" },
  { value: "ACCOUNT_DELETION", label: "Account Deletion" },
  { value: "ACCESS_REQUEST", label: "Access Request" },
  { value: "ASSET_ASSIGNMENT", label: "Asset Assignment" },
  { value: "ASSET_UNASSIGNMENT", label: "Asset Unassignment" },
  { value: "OTHER", label: "Other" },
];

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];
const STATUS_FILTER_OPTIONS = [
  "ALL",
  "PENDING_HR",
  "APPROVED_BY_HR",
  "IN_PROGRESS_BY_IT",
  "RESOLVED",
  "REJECTED_BY_HR",
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  requestType: "TECH_SUPPORT",
  priority: "MEDIUM",
  attachment: null,
};

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

function applyFilters(rows, searchTerm, statusFilter, priorityFilter) {
  return rows.filter((ticket) => {
    const textMatch = `${ticket.title} ${ticket.requestType} ${ticket.priority} ${ticket.status}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const statusMatch =
      statusFilter === "ALL" ? true : ticket.status === statusFilter;

    const priorityMatch =
      priorityFilter === "ALL" ? true : ticket.priority === priorityFilter;

    return textMatch && statusMatch && priorityMatch;
  });
}

export default function EmployeeDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [hasDraft, setHasDraft] = useState(false);
  const [seenNotificationsAt, setSeenNotificationsAt] = useState(() => {
    return localStorage.getItem(NOTIFICATION_SEEN_KEY) || "";
  });

  async function fetchTickets() {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/tickets");
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) {
      setHasDraft(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft);
      const hasUsefulDraft =
        parsed?.title || parsed?.description || parsed?.requestType || parsed?.priority;

      setHasDraft(Boolean(hasUsefulDraft));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  }, []);

  useEffect(() => {
    const draftPayload = {
      title: formData.title,
      description: formData.description,
      requestType: formData.requestType,
      priority: formData.priority,
    };

    const isEmpty =
      !draftPayload.title &&
      !draftPayload.description &&
      draftPayload.requestType === "TECH_SUPPORT" &&
      draftPayload.priority === "MEDIUM";

    if (isEmpty) {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      return;
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload));
    setHasDraft(true);
  }, [formData.title, formData.description, formData.requestType, formData.priority]);

  const openTickets = useMemo(() => {
    return tickets.filter((ticket) =>
      ["PENDING_HR", "APPROVED_BY_HR", "IN_PROGRESS_BY_IT"].includes(ticket.status)
    );
  }, [tickets]);

  const historyTickets = useMemo(() => {
    return tickets.filter((ticket) =>
      ["REJECTED_BY_HR", "RESOLVED"].includes(ticket.status)
    );
  }, [tickets]);

  const filteredOpenTickets = useMemo(() => {
    return applyFilters(openTickets, searchTerm, statusFilter, priorityFilter);
  }, [openTickets, searchTerm, statusFilter, priorityFilter]);

  const filteredHistoryTickets = useMemo(() => {
    return applyFilters(historyTickets, searchTerm, statusFilter, priorityFilter);
  }, [historyTickets, searchTerm, statusFilter, priorityFilter]);

  const totalTickets = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === "PENDING_HR").length;
  const inProgressCount = tickets.filter((t) =>
    ["APPROVED_BY_HR", "IN_PROGRESS_BY_IT"].includes(t.status)
  ).length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  const recentActivity = useMemo(() => {
    const activityItems = [];

    tickets.forEach((ticket) => {
      if (Array.isArray(ticket.activityLog) && ticket.activityLog.length) {
        ticket.activityLog.forEach((item) => {
          activityItems.push({
            ticketId: ticket._id,
            ticketTitle: ticket.title,
            action: item.action || "Updated",
            note: item.note || "",
            role: item.role || "System",
            timestamp: item.timestamp,
            status: ticket.status,
          });
        });
      } else {
        activityItems.push({
          ticketId: ticket._id,
          ticketTitle: ticket.title,
          action: "Ticket Created",
          note: ticket.description || "",
          role: "Employee",
          timestamp: ticket.createdAt,
          status: ticket.status,
        });
      }
    });

    return activityItems
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);
  }, [tickets]);

  const notificationItems = useMemo(() => {
    return tickets
      .filter((ticket) =>
        ["PENDING_HR", "APPROVED_BY_HR", "IN_PROGRESS_BY_IT"].includes(ticket.status)
      )
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 6)
      .map((ticket) => ({
        id: ticket._id,
        title: ticket.title,
        message: `Status: ${formatStatus(ticket.status)}`,
        time: ticket.updatedAt || ticket.createdAt,
      }));
  }, [tickets]);

  const unreadNotificationCount = useMemo(() => {
    if (!seenNotificationsAt) return notificationItems.length;

    return notificationItems.filter(
      (item) => new Date(item.time) > new Date(seenNotificationsAt)
    ).length;
  }, [notificationItems, seenNotificationsAt]);

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function handleAttachmentChange(e) {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      attachment: file,
    }));
  }

  function openCreateModal() {
    setError("");
    setSuccess("");
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
  }

  function loadDraft() {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft);
      setFormData((prev) => ({
        ...prev,
        title: parsed.title || "",
        description: parsed.description || "",
        requestType: parsed.requestType || "TECH_SUPPORT",
        priority: parsed.priority || "MEDIUM",
      }));
      setShowCreateModal(true);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setFormData(DEFAULT_FORM);
  }

  function handleNotificationClick() {
    const now = new Date().toISOString();
    localStorage.setItem(NOTIFICATION_SEEN_KEY, now);
    setSeenNotificationsAt(now);
    setShowNotificationsPanel((prev) => !prev);
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("description", formData.description.trim());
      payload.append("requestType", formData.requestType);
      payload.append("priority", formData.priority);

      if (formData.attachment) {
        payload.append("attachment", formData.attachment);
      }

      await api.post("/tickets", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess("Ticket submitted successfully.");
      setFormData(DEFAULT_FORM);
      setShowCreateModal(false);
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      await fetchTickets();
      setActiveTab("open");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
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

  function TicketTable({ rows, emptyText }) {
    if (loading) {
      return <div className="dashboard-empty">Loading tickets...</div>;
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
                <td className="ticket-title-cell">{ticket.title}</td>
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
                    className="table-action-btn"
                    onClick={() => handleViewDetails(ticket._id)}
                  >
                    View Details
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

      <div className="employee-page">
        <section className="hero-card">
          <div>
            <p className="eyebrow">OfficeOps Employee Portal</p>
            <h1>Employee Dashboard</h1>
            <p className="hero-subtext">
              Create requests, track progress, manage drafts, and review your
              full ticket lifecycle in one clean workspace.
            </p>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" onClick={openCreateModal}>
              + New Request
            </button>

            <button className="ghost-btn" onClick={fetchTickets}>
              Refresh
            </button>

            {hasDraft ? (
              <button className="ghost-btn" onClick={loadDraft}>
                Resume Draft
              </button>
            ) : null}
          </div>
        </section>

        {error && <div className="error-box dashboard-message">{error}</div>}
        {success && (
          <div className="success-box dashboard-message">{success}</div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Tickets</span>
            <h3>{totalTickets}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-label">Pending HR</span>
            <h3>{pendingCount}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-label">In Progress</span>
            <h3>{inProgressCount}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-label">Resolved</span>
            <h3>{resolvedCount}</h3>
          </div>
        </section>

        <div className="employee-layout">
          <main className="employee-main">
            <section className="quick-actions-grid">
              <button className="quick-card" onClick={() => setActiveTab("open")}>
                <div>
                  <h3>My Tickets</h3>
                  <p>View your active tickets and current progress.</p>
                </div>
                <span>{openTickets.length}</span>
              </button>

              <button className="quick-card" onClick={openCreateModal}>
                <div>
                  <h3>Create Request</h3>
                  <p>Submit a new support, account, or access request.</p>
                </div>
                <span>+</span>
              </button>

              <button className="quick-card" onClick={() => setActiveTab("history")}>
                <div>
                  <h3>Ticket History</h3>
                  <p>Review resolved or rejected requests.</p>
                </div>
                <span>{historyTickets.length}</span>
              </button>
            </section>

            <section className="panel-card">
              <div className="panel-header panel-header-wrap">
                <div className="tabs">
                  <button
                    className={activeTab === "open" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("open")}
                  >
                    Open Tickets
                  </button>
                  <button
                    className={activeTab === "history" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("history")}
                  >
                    Ticket History
                  </button>
                </div>

                <div className="filters-row">
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search tickets..."
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
                    <option value="ALL">All Priorities</option>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {formatStatus(priority)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTab === "open" ? (
                <TicketTable
                  rows={filteredOpenTickets}
                  emptyText="No open tickets right now."
                />
              ) : (
                <TicketTable
                  rows={filteredHistoryTickets}
                  emptyText="No ticket history yet."
                />
              )}
            </section>
          </main>

          <aside className="employee-sidebar">
            <section className="side-card">
              <div className="side-card-header">
                <h3>Recent Activity</h3>
                <button className="text-btn" onClick={fetchTickets}>
                  Refresh
                </button>
              </div>

              {recentActivity.length ? (
                <div className="activity-list">
                  {recentActivity.map((item, index) => (
                    <div
                      key={`${item.ticketId}-${item.timestamp}-${index}`}
                      className="activity-item"
                    >
                      <strong>{item.action}</strong>
                      <p>{item.ticketTitle}</p>
                      <span>
                        {item.role} • {formatDate(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty small-empty">
                  No recent activity yet.
                </div>
              )}
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <h3>Draft Request</h3>
                {hasDraft ? (
                  <button className="text-btn danger-text" onClick={clearDraft}>
                    Clear
                  </button>
                ) : null}
              </div>

              {hasDraft ? (
                <div className="draft-box">
                  <p>You have an unsent request saved locally.</p>
                  <button className="ghost-btn full-width" onClick={loadDraft}>
                    Resume Draft
                  </button>
                </div>
              ) : (
                <div className="dashboard-empty small-empty">
                  No saved draft.
                </div>
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
          <div
            className="notification-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notification-top">
              <h3>Notifications</h3>
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
                No notifications right now.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div
            className="modal-card clean-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-top">
              <div>
                <p className="eyebrow">New Request</p>
                <h2>Create Ticket</h2>
              </div>
              <button className="modal-close" onClick={closeCreateModal} type="button">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <label className="field-label">Title</label>
              <input
                className="field-input"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter a short title"
                required
              />

              <label className="field-label">Description</label>
              <textarea
                className="field-input"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the issue or request clearly"
                rows="5"
                required
              />

              <div className="two-col-grid">
                <div>
                  <label className="field-label">Request Type</label>
                  <select
                    className="field-input"
                    name="requestType"
                    value={formData.requestType}
                    onChange={handleChange}
                  >
                    {REQUEST_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Priority</label>
                  <select
                    className="field-input"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {formatStatus(priority)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="field-label">Attachment</label>
              <input
                className="field-input"
                type="file"
                onChange={handleAttachmentChange}
              />

              {formData.attachment ? (
                <div className="attachment-chip">
                  Selected: {formData.attachment.name}
                </div>
              ) : null}

              <div className="modal-actions">
                <button className="ghost-btn" type="button" onClick={closeCreateModal}>
                  Close
                </button>

                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSuccess("Draft saved locally.");
                  }}
                >
                  Save Draft
                </button>

                <button className="primary-btn" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {(selectedTicket || detailsLoading) ? (
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

                {Array.isArray(selectedTicket.attachments) &&
                selectedTicket.attachments.length ? (
                  <div className="description-box">
                    <span>Attachments</span>
                    <div className="attachments-list">
                      {selectedTicket.attachments.map((file, index) => (
                        <a
                          key={`${file.fileName}-${index}`}
                          href={`http://localhost:5000/${String(file.filePath).replaceAll("\\", "/")}`}
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

                {Array.isArray(selectedTicket.activityLog) &&
                selectedTicket.activityLog.length ? (
                  <div className="activity-section">
                    <h3>Activity Log</h3>
                    <div className="activity-list">
                      {selectedTicket.activityLog.map((item, index) => (
                        <div
                          key={`${item.timestamp}-${index}`}
                          className="activity-item"
                        >
                          <strong>{item.action}</strong>
                          <p>{item.note || "-"}</p>
                          <span>
                            {(item.role || "System")} • {formatDate(item.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
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