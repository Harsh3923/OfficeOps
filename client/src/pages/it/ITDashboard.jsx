import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import "../../styles/dashboard.css";
import "../../styles/hrDashboard.css";
import "../../styles/itDashboard.css";

const TASK_ACTIONS = [
  "CREATE_ASSET",
  "ASSET_REQUEST",
  "ACCESS_REQUEST",
  "ASSET_ASSIGNMENT",
  "ASSET_UNASSIGNMENT",
  "ACCOUNT_UPDATE",
  "ACCOUNT_DELETION",
];

const ACTION_LABELS = {
  CREATE_ASSET: "Create Asset",
  ASSET_REQUEST: "Asset Request",
  ACCESS_REQUEST: "Access Request",
  ASSET_ASSIGNMENT: "Asset Assignment",
  ASSET_UNASSIGNMENT: "Asset Unassignment",
  ACCOUNT_UPDATE: "Account Update",
  ACCOUNT_DELETION: "Account Deletion",
};

const REQUEST_TYPE_LABELS = {
  TECH_SUPPORT: "Tech Support",
  ASSET_REQUEST: "Asset Request",
  ACCESS_REQUEST: "Access Request",
  ASSET_ASSIGNMENT: "Asset Assignment",
  ASSET_UNASSIGNMENT: "Asset Unassignment",
  ACCOUNT_UPDATE: "Account Update",
  ACCOUNT_DELETION: "Account Deletion",
  OTHER: "Other",
};

const TODO_STORAGE_KEY = "officeops_it_todo_state_v4";
const NOTIFICATION_SEEN_KEY = "officeops_it_notifications_seen_at";

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
    case "APPROVED_BY_HR":
      return "status-pill status-approved";
    case "IN_PROGRESS_BY_IT":
      return "status-pill status-progress";
    case "RESOLVED":
      return "status-pill status-resolved";
    default:
      return "status-pill";
  }
}

function loadTodoState() {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTodoState(state) {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(state));
}

function buildTodoFromTicket(ticket) {
  const requestType = ticket?.requestType || "OTHER";

  let actionType = requestType;
  if (!TASK_ACTIONS.includes(actionType)) {
    if (requestType === "TECH_SUPPORT" || requestType === "OTHER") {
      actionType = "ACCESS_REQUEST";
    } else {
      actionType = "ASSET_REQUEST";
    }
  }

  let summary = REQUEST_TYPE_LABELS[requestType] || formatStatus(requestType);

  if (requestType === "ASSET_ASSIGNMENT") {
    summary = "Assign device to employee";
  }

  if (requestType === "ASSET_UNASSIGNMENT") {
    summary = "Unassign device from employee";
  }

  if (requestType === "ACCOUNT_UPDATE") {
    summary = "Update employee account";
  }

  if (requestType === "ACCOUNT_DELETION") {
    summary = "Delete employee account";
  }

  if (requestType === "ASSET_REQUEST") {
    summary = ticket?.title || "Fulfill asset request";
  }

  if (requestType === "ACCESS_REQUEST") {
    summary = ticket?.title || "Complete access request";
  }

  return {
    id: `${ticket._id}-${Date.now()}`,
    ticketId: ticket._id,
    ticketTitle: ticket.title,
    employeeName: ticket.createdBy?.name || "Employee",
    requestType,
    actionType,
    summary,
    performed: false,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

const initialAssetForm = {
  assetName: "",
  assetTag: "",
  category: "LAPTOP",
  serialNumber: "",
  purchaseDate: "",
  condition: "GOOD",
  notes: "",
};

const initialAccountUpdateForm = {
  employeeId: "",
  name: "",
  email: "",
  department: "",
  jobTitle: "",
  location: "",
};

export default function ITDashboard() {
  const [queue, setQueue] = useState({
    approved: [],
    inProgress: [],
    resolved: [],
  });
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [activeTab, setActiveTab] = useState("approved");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [todoState, setTodoState] = useState(() => loadTodoState());
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [createAssetLoading, setCreateAssetLoading] = useState(false);
  const [assetForm, setAssetForm] = useState(initialAssetForm);

  const [assignAssetId, setAssignAssetId] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignLoadingId, setAssignLoadingId] = useState("");

  const [showAccountUpdateModal, setShowAccountUpdateModal] = useState(false);
  const [accountUpdateLoading, setAccountUpdateLoading] = useState(false);
  const [accountUpdateForm, setAccountUpdateForm] = useState(initialAccountUpdateForm);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [accountDeleteLoading, setAccountDeleteLoading] = useState(false);

  const [showTopAssignModal, setShowTopAssignModal] = useState(false);
  const [topAssignEmployeeId, setTopAssignEmployeeId] = useState("");
  const [topAssignAssetId, setTopAssignAssetId] = useState("");
  const [topAssignLoading, setTopAssignLoading] = useState(false);

  const [showTopUnassignModal, setShowTopUnassignModal] = useState(false);
  const [topUnassignEmployeeId, setTopUnassignEmployeeId] = useState("");
  const [topUnassignAssetId, setTopUnassignAssetId] = useState("");
  const [topUnassignLoading, setTopUnassignLoading] = useState(false);

  const [seenNotificationsAt, setSeenNotificationsAt] = useState(() => {
    return localStorage.getItem(NOTIFICATION_SEEN_KEY) || "";
  });

  useEffect(() => {
    saveTodoState(todoState);
  }, [todoState]);

  async function loadQueue() {
    const { data } = await api.get("/tickets/it/queue");
    setQueue(
      data?.queue || {
        approved: [],
        inProgress: [],
        resolved: [],
      }
    );
  }

  async function loadAssets() {
    const { data } = await api.get("/assets");
    setAssets(Array.isArray(data?.assets) ? data.assets : []);
  }

  async function loadEmployees() {
    const { data } = await api.get("/employees");
    const allEmployees = Array.isArray(data?.employees) ? data.employees : [];
    setEmployees(allEmployees.filter((employee) => employee.role === "EMPLOYEE"));
  }

  async function loadStats() {
    const { data } = await api.get("/stats");
    setStats(data?.stats || null);
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadQueue(), loadAssets(), loadEmployees(), loadStats()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load IT dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const approvedTickets = queue.approved || [];
  const inProgressTickets = queue.inProgress || [];
  const resolvedTickets = queue.resolved || [];

  const currentTickets = useMemo(() => {
    if (activeTab === "approved") return approvedTickets;
    if (activeTab === "inProgress") return inProgressTickets;
    return resolvedTickets;
  }, [activeTab, approvedTickets, inProgressTickets, resolvedTickets]);

  const allTodoItems = useMemo(() => {
    return Object.values(todoState)
      .flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [todoState]);

  const selectedTicketTodos = useMemo(() => {
    if (!selectedTicketId) return [];
    return todoState[selectedTicketId] || [];
  }, [todoState, selectedTicketId]);

  const canResolveTicket = useMemo(() => {
    if (!selectedTicketId) return false;
    const items = todoState[selectedTicketId] || [];
    if (!items.length) return false;
    return items.every((item) => item.completed);
  }, [todoState, selectedTicketId]);

  const selectedTicket = useMemo(() => {
    return (
      [...approvedTickets, ...inProgressTickets, ...resolvedTickets].find(
        (ticket) => ticket._id === selectedTicketId
      ) || null
    );
  }, [approvedTickets, inProgressTickets, resolvedTickets, selectedTicketId]);

  const recentActivity = useMemo(() => {
    return resolvedTickets.slice(0, 6);
  }, [resolvedTickets]);

  const notificationItems = useMemo(() => {
    return approvedTickets
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 6)
      .map((ticket) => ({
        id: ticket._id,
        title: ticket.title,
        message: `${ticket.createdBy?.name || "Employee"} has an HR-approved ticket ready for IT.`,
        time: ticket.updatedAt || ticket.createdAt,
      }));
  }, [approvedTickets]);

  const unreadNotificationCount = useMemo(() => {
    if (!seenNotificationsAt) return notificationItems.length;
    return notificationItems.filter((item) => new Date(item.time) > new Date(seenNotificationsAt))
      .length;
  }, [notificationItems, seenNotificationsAt]);

  const availableAssets = useMemo(() => {
    return assets.filter((asset) => asset.status === "AVAILABLE");
  }, [assets]);

  const assignedAssetsForTopEmployee = useMemo(() => {
    if (!topUnassignEmployeeId) return [];
    return assets.filter(
      (asset) =>
        asset.status === "ASSIGNED" &&
        asset.assignedTo &&
        asset.assignedTo._id === topUnassignEmployeeId
    );
  }, [assets, topUnassignEmployeeId]);

  function handleNotificationClick() {
    const now = new Date().toISOString();
    localStorage.setItem(NOTIFICATION_SEEN_KEY, now);
    setSeenNotificationsAt(now);
    setShowNotificationsPanel((prev) => !prev);
  }

  function clearBanner() {
    setMessage("");
    setError("");
  }

  async function handleStartTicket(ticketId) {
    try {
      clearBanner();
      setActionLoadingId(ticketId);
      await api.patch(`/tickets/${ticketId}/start`);
      setMessage("Ticket moved to In Progress.");
      setActiveTab("inProgress");
      setSelectedTicketId(ticketId);
      await Promise.all([loadQueue(), loadStats()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start ticket.");
    } finally {
      setActionLoadingId("");
    }
  }

  function handleExecuteTicket(ticket) {
    clearBanner();

    const currentTodos = todoState[ticket._id] || [];
    const nextTodo = buildTodoFromTicket(ticket);

    const alreadyExists = currentTodos.some(
      (item) =>
        item.requestType === ticket.requestType &&
        item.summary === nextTodo.summary
    );

    if (alreadyExists) {
      setSelectedTicketId(ticket._id);
      setMessage("Task already exists in the To Do list for this ticket.");
      return;
    }

    setTodoState((prev) => ({
      ...prev,
      [ticket._id]: [...(prev[ticket._id] || []), nextTodo],
    }));

    setSelectedTicketId(ticket._id);
    setMessage("Task sent to the To Do list. Perform the action, then mark it done.");
  }

  async function handleCreateAsset(e) {
    e.preventDefault();

    try {
      clearBanner();
      setCreateAssetLoading(true);

      await api.post("/assets", {
        assetName: assetForm.assetName,
        assetTag: assetForm.assetTag,
        category: assetForm.category,
        serialNumber: assetForm.serialNumber,
        purchaseDate: assetForm.purchaseDate || null,
        condition: assetForm.condition,
        notes: assetForm.notes,
      });

      setShowCreateAssetModal(false);
      setAssetForm(initialAssetForm);
      setMessage("Asset created successfully.");
      await Promise.all([loadAssets(), loadStats()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create asset.");
    } finally {
      setCreateAssetLoading(false);
    }
  }

  async function handleAssignAsset(assetId) {
    try {
      if (!assignEmployeeId) {
        setError("Select an employee first.");
        return;
      }

      clearBanner();
      setAssignLoadingId(assetId);

      await api.patch(`/assets/${assetId}/assign`, {
        employeeId: assignEmployeeId,
      });

      setAssignAssetId("");
      setAssignEmployeeId("");
      setMessage("Asset assigned successfully.");
      await Promise.all([loadAssets(), loadStats()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign asset.");
    } finally {
      setAssignLoadingId("");
    }
  }

  async function handleUnassignAsset(assetId) {
    try {
      clearBanner();
      setAssignLoadingId(assetId);
      await api.patch(`/assets/${assetId}/unassign`);
      setMessage("Asset unassigned successfully.");
      await Promise.all([loadAssets(), loadStats()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to unassign asset.");
    } finally {
      setAssignLoadingId("");
    }
  }

  function markTaskPerformed(actionType) {
    setTodoState((prev) => ({
      ...prev,
      [selectedTicketId]: (prev[selectedTicketId] || []).map((item) =>
        item.actionType === actionType && !item.performed
          ? { ...item, performed: true }
          : item
      ),
    }));
  }

  function openTopAssignModal() {
    clearBanner();

    if (!selectedTicketId || !selectedTicket) {
      setError("Select an in-progress asset assignment ticket first.");
      return;
    }

    const ticketTodos = todoState[selectedTicketId] || [];
    const pendingTask = ticketTodos.find(
      (item) => item.actionType === "ASSET_ASSIGNMENT" && !item.performed
    );

    if (!pendingTask) {
      setError("No pending asset assignment task found for the selected ticket.");
      return;
    }

    setTopAssignEmployeeId("");
    setTopAssignAssetId("");
    setShowTopAssignModal(true);
  }

  async function submitTopAssign(e) {
    e.preventDefault();

    try {
      clearBanner();

      if (!topAssignEmployeeId || !topAssignAssetId) {
        setError("Select both an employee and an asset.");
        return;
      }

      setTopAssignLoading(true);

      await api.patch(`/assets/${topAssignAssetId}/assign`, {
        employeeId: topAssignEmployeeId,
      });

      markTaskPerformed("ASSET_ASSIGNMENT");
      setShowTopAssignModal(false);
      setMessage("Asset assigned successfully. Now click the task in To Do to mark it done.");
      await Promise.all([loadAssets(), loadStats(), loadQueue()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign asset.");
    } finally {
      setTopAssignLoading(false);
    }
  }

  function openTopUnassignModal() {
    clearBanner();

    if (!selectedTicketId || !selectedTicket) {
      setError("Select an in-progress asset unassignment ticket first.");
      return;
    }

    const ticketTodos = todoState[selectedTicketId] || [];
    const pendingTask = ticketTodos.find(
      (item) => item.actionType === "ASSET_UNASSIGNMENT" && !item.performed
    );

    if (!pendingTask) {
      setError("No pending asset unassignment task found for the selected ticket.");
      return;
    }

    setTopUnassignEmployeeId("");
    setTopUnassignAssetId("");
    setShowTopUnassignModal(true);
  }

  async function submitTopUnassign(e) {
    e.preventDefault();

    try {
      clearBanner();

      if (!topUnassignEmployeeId || !topUnassignAssetId) {
        setError("Select both an employee and a device.");
        return;
      }

      setTopUnassignLoading(true);

      await api.patch(`/assets/${topUnassignAssetId}/unassign`);

      markTaskPerformed("ASSET_UNASSIGNMENT");
      setShowTopUnassignModal(false);
      setMessage("Asset unassigned successfully. Now click the task in To Do to mark it done.");
      await Promise.all([loadAssets(), loadStats(), loadQueue()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to unassign asset.");
    } finally {
      setTopUnassignLoading(false);
    }
  }

  function openAccountUpdateModal() {
    clearBanner();

    if (!selectedTicketId || !selectedTicket) {
      setError("Select an in-progress account update ticket first.");
      return;
    }

    const ticketTodos = todoState[selectedTicketId] || [];
    const pendingTask = ticketTodos.find(
      (item) => item.actionType === "ACCOUNT_UPDATE" && !item.performed
    );

    if (!pendingTask) {
      setError("No pending account update task found for the selected ticket.");
      return;
    }

    const changes = selectedTicket.requestedChanges || {};

    setAccountUpdateForm({
      employeeId: changes.employeeId || "",
      name: changes.name || "",
      email: changes.email || "",
      department: changes.department || "",
      jobTitle: changes.jobTitle || "",
      location: changes.location || "",
    });
    setShowAccountUpdateModal(true);
  }

  async function submitAccountUpdate(e) {
    e.preventDefault();

    try {
      clearBanner();

      if (!selectedTicketId || !selectedTicket) {
        setError("No ticket selected.");
        return;
      }

      if (!accountUpdateForm.employeeId) {
        setError("Employee ID is required.");
        return;
      }

      setAccountUpdateLoading(true);

      await api.patch(`/employees/${accountUpdateForm.employeeId}`, {
        name: accountUpdateForm.name,
        email: accountUpdateForm.email,
        department: accountUpdateForm.department,
        jobTitle: accountUpdateForm.jobTitle,
        location: accountUpdateForm.location,
      });

      markTaskPerformed("ACCOUNT_UPDATE");
      setShowAccountUpdateModal(false);
      setMessage("Employee account updated. Now click the task in To Do to mark it done.");
      await Promise.all([loadEmployees(), loadQueue()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update employee account.");
    } finally {
      setAccountUpdateLoading(false);
    }
  }

  function openDeleteConfirmModal() {
    clearBanner();

    if (!selectedTicketId || !selectedTicket) {
      setError("Select an in-progress account deletion ticket first.");
      return;
    }

    const ticketTodos = todoState[selectedTicketId] || [];
    const pendingTask = ticketTodos.find(
      (item) => item.actionType === "ACCOUNT_DELETION" && !item.performed
    );

    if (!pendingTask) {
      setError("No pending account deletion task found for the selected ticket.");
      return;
    }

    const changes = selectedTicket.requestedChanges || {};

    if (!changes.employeeId) {
      setError("This ticket does not include an employeeId in requestedChanges.");
      return;
    }

    const employee =
      employees.find((item) => item._id === changes.employeeId) || null;

    setDeleteTarget({
      employeeId: changes.employeeId,
      name: employee?.name || changes.name || "Selected Employee",
      email: employee?.email || changes.email || "",
    });

    setShowDeleteConfirmModal(true);
  }

  async function confirmAccountDeletion() {
    try {
      clearBanner();

      if (!deleteTarget?.employeeId || !selectedTicketId) {
        setError("Missing employee for deletion.");
        return;
      }

      setAccountDeleteLoading(true);

      await api.delete(`/employees/${deleteTarget.employeeId}`);

      markTaskPerformed("ACCOUNT_DELETION");
      setShowDeleteConfirmModal(false);
      setDeleteTarget(null);
      setMessage("Employee account deleted. Now click the task in To Do to mark it done.");
      await Promise.all([loadEmployees(), loadQueue(), loadStats()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete employee account.");
    } finally {
      setAccountDeleteLoading(false);
    }
  }

  function handlePerformAction(actionType) {
    clearBanner();

    if (!selectedTicketId || !selectedTicket) {
      setError("Select an in-progress ticket first.");
      return;
    }

    const items = todoState[selectedTicketId] || [];
    const nextPending = items.find((item) => item.actionType === actionType && !item.performed);

    if (!nextPending) {
      setError("No matching pending task found for that action.");
      return;
    }

    if (actionType === "ACCOUNT_UPDATE") {
      openAccountUpdateModal();
      return;
    }

    if (actionType === "ACCOUNT_DELETION") {
      openDeleteConfirmModal();
      return;
    }

    if (actionType === "ASSET_ASSIGNMENT") {
      openTopAssignModal();
      return;
    }

    if (actionType === "ASSET_UNASSIGNMENT") {
      openTopUnassignModal();
      return;
    }

    if (actionType === "ASSET_REQUEST") {
      setMessage("Use Create Asset or Assign in Asset Inventory to fulfill this request.");
      return;
    }

    if (actionType === "ACCESS_REQUEST") {
      setMessage("Access Request does not have a dedicated backend action yet.");
      return;
    }

    if (actionType === "CREATE_ASSET") {
      setShowCreateAssetModal(true);
      return;
    }

    setError("This action is not supported yet.");
  }

  function handleToggleTodoDone(ticketId, todoId) {
    clearBanner();

    const items = todoState[ticketId] || [];
    const target = items.find((item) => item.id === todoId);

    if (!target) return;

    if (!target.performed && !target.completed) {
      setError("Perform the action first before marking this task done.");
      return;
    }

    setTodoState((prev) => ({
      ...prev,
      [ticketId]: (prev[ticketId] || []).map((item) =>
        item.id === todoId ? { ...item, completed: !item.completed } : item
      ),
    }));
  }

  async function handleResolveTicket(ticket) {
    try {
      clearBanner();

      const items = todoState[ticket._id] || [];
      if (!items.length) {
        setError("You need to Execute first so a task appears in the To Do list.");
        return;
      }

      if (!items.every((item) => item.completed)) {
        setError("Finish the task in the To Do list before resolving this ticket.");
        return;
      }

      setActionLoadingId(ticket._id);

      const resolutionNote = items.map((item) => `• ${item.summary}`).join("\n");

      await api.patch(`/tickets/${ticket._id}/resolve`, {
        resolutionNote: `Completed IT task(s):\n${resolutionNote}`,
      });

      setTodoState((prev) => {
        const next = { ...prev };
        delete next[ticket._id];
        return next;
      });

      setSelectedTicketId("");
      setMessage("Ticket resolved successfully.");
      setActiveTab("resolved");
      await Promise.all([loadQueue(), loadStats(), loadAssets()]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resolve ticket.");
    } finally {
      setActionLoadingId("");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar notificationCount={0} onNotificationClick={() => {}} />
        <div className="hr-page it-page-shell">
          <div className="dashboard-empty">Loading IT dashboard...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar
        notificationCount={unreadNotificationCount}
        onNotificationClick={handleNotificationClick}
      />

      <div className="hr-page it-page-shell">
        <section className="it-action-bar panel-card">
          <button
            className="primary-btn"
            type="button"
            onClick={() => setShowCreateAssetModal(true)}
          >
            Create Asset
          </button>

          {TASK_ACTIONS.filter((item) => item !== "CREATE_ASSET").map((action) => (
            <button
              key={action}
              className="ghost-btn it-wide-action-btn"
              type="button"
              onClick={() => handlePerformAction(action)}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </section>

        <section className="hero-card">
          <div>
            <p className="eyebrow">OfficeOps IT Portal</p>
            <h1>IT Operations Dashboard</h1>
            <p className="hero-subtext">
              Start approved tickets, execute the real action, mark the To Do item done,
              then resolve the ticket.
            </p>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" type="button" onClick={loadDashboard}>
              Refresh Queue
            </button>
          </div>
        </section>

        {error ? <div className="error-box dashboard-message">{error}</div> : null}
        {message ? <div className="success-box dashboard-message">{message}</div> : null}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Approved by HR</span>
            <h3>{approvedTickets.length}</h3>
          </div>
          <div className="stat-card">
            <span className="stat-label">In Progress</span>
            <h3>{inProgressTickets.length}</h3>
          </div>
          <div className="stat-card">
            <span className="stat-label">Resolved</span>
            <h3>{resolvedTickets.length}</h3>
          </div>
          <div className="stat-card">
            <span className="stat-label">Available Assets</span>
            <h3>{stats?.availableAssets ?? 0}</h3>
          </div>
        </section>

        <div className="employee-layout it-layout">
          <main className="employee-main">
            <section className="panel-card">
              <div className="panel-header panel-header-wrap">
                <h3>IT Ticket Queue</h3>

                <div className="tabs">
                  <button
                    className={activeTab === "approved" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("approved")}
                    type="button"
                  >
                    Approved
                  </button>
                  <button
                    className={activeTab === "inProgress" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("inProgress")}
                    type="button"
                  >
                    In Progress
                  </button>
                  <button
                    className={activeTab === "resolved" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("resolved")}
                    type="button"
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {!currentTickets.length ? (
                <div className="dashboard-empty">No tickets found in this section.</div>
              ) : (
                <div className="table-wrap">
                  <table className="tickets-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Employee</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTickets.map((ticket) => {
                        const isSelected = selectedTicketId === ticket._id;
                        const ticketTodos = todoState[ticket._id] || [];
                        const rowCanResolve =
                          ticketTodos.length && ticketTodos.every((item) => item.completed);

                        return (
                          <tr
                            key={ticket._id}
                            className={isSelected ? "it-selected-row" : ""}
                            onClick={() => setSelectedTicketId(ticket._id)}
                          >
                            <td className="ticket-title-cell">{ticket.title}</td>
                            <td>
                              <div style={{ display: "grid", gap: "2px" }}>
                                <strong>{ticket.createdBy?.name || "-"}</strong>
                                <span style={{ fontSize: "12px", color: "#667085" }}>
                                  {ticket.createdBy?.email || "-"}
                                </span>
                              </div>
                            </td>
                            <td>
                              {REQUEST_TYPE_LABELS[ticket.requestType] ||
                                formatStatus(ticket.requestType)}
                            </td>
                            <td>
                              <span className={getStatusClass(ticket.status)}>
                                {formatStatus(ticket.status)}
                              </span>
                            </td>
                            <td>{formatDate(ticket.createdAt)}</td>
                            <td>
                              <div className="it-row-btns" onClick={(e) => e.stopPropagation()}>
                                {activeTab === "approved" ? (
                                  <button
                                    className="table-action-btn action-approve-btn"
                                    type="button"
                                    onClick={() => handleStartTicket(ticket._id)}
                                    disabled={actionLoadingId === ticket._id}
                                  >
                                    {actionLoadingId === ticket._id ? "Starting..." : "Start"}
                                  </button>
                                ) : null}

                                {activeTab === "inProgress" ? (
                                  <>
                                    <button
                                      className="table-action-btn action-view-btn"
                                      type="button"
                                      onClick={() => handleExecuteTicket(ticket)}
                                    >
                                      Execute
                                    </button>
                                    <button
                                      className="table-action-btn action-approve-btn"
                                      type="button"
                                      onClick={() => handleResolveTicket(ticket)}
                                      disabled={!rowCanResolve || actionLoadingId === ticket._id}
                                    >
                                      {actionLoadingId === ticket._id ? "Resolving..." : "Resolve"}
                                    </button>
                                  </>
                                ) : null}

                                {activeTab === "resolved" ? (
                                  <span className="it-resolved-note-tag">Done</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel-card">
              <div className="side-card-header">
                <h3>Asset Inventory</h3>
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => setShowCreateAssetModal(true)}
                >
                  + New Asset
                </button>
              </div>

              {!assets.length ? (
                <div className="dashboard-empty">No assets found.</div>
              ) : (
                <div className="it-assets-grid">
                  {assets.map((asset) => (
                    <div key={asset._id} className="activity-item it-asset-card">
                      <strong>{asset.assetName}</strong>
                      <p>{asset.assetTag}</p>
                      <span>
                        {asset.category} • {asset.status}
                      </span>

                      {asset.assignedTo ? (
                        <div className="it-asset-assigned">
                          Assigned to: {asset.assignedTo.name}
                        </div>
                      ) : null}

                      <div className="it-asset-actions">
                        {asset.status === "AVAILABLE" ? (
                          <>
                            {assignAssetId === asset._id ? (
                              <div className="it-inline-assign">
                                <select
                                  className="filter-select"
                                  value={assignEmployeeId}
                                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                                >
                                  <option value="">Select employee</option>
                                  {employees.map((employee) => (
                                    <option key={employee._id} value={employee._id}>
                                      {employee.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="table-action-btn action-approve-btn"
                                  type="button"
                                  onClick={() => handleAssignAsset(asset._id)}
                                  disabled={assignLoadingId === asset._id}
                                >
                                  {assignLoadingId === asset._id ? "Saving..." : "Save"}
                                </button>
                              </div>
                            ) : (
                              <button
                                className="table-action-btn action-view-btn"
                                type="button"
                                onClick={() => {
                                  setAssignAssetId(asset._id);
                                  setAssignEmployeeId("");
                                }}
                              >
                                Assign
                              </button>
                            )}
                          </>
                        ) : null}

                        {asset.status === "ASSIGNED" ? (
                          <button
                            className="table-action-btn action-reject-btn"
                            type="button"
                            onClick={() => handleUnassignAsset(asset._id)}
                            disabled={assignLoadingId === asset._id}
                          >
                            {assignLoadingId === asset._id ? "Working..." : "Unassign"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="employee-sidebar">
            <section className="side-card">
              <div className="side-card-header">
                <h3>To Do List</h3>
                <button className="text-btn" type="button">
                  {selectedTicket ? "Selected Ticket" : "Pick a Ticket"}
                </button>
              </div>

              {!selectedTicket ? (
                <div className="dashboard-empty small-empty">
                  Select an in-progress ticket, then click Execute to send its task here.
                </div>
              ) : !selectedTicketTodos.length ? (
                <div className="dashboard-empty small-empty">
                  No tasks yet for <strong>{selectedTicket.title}</strong>. Click Execute first.
                </div>
              ) : (
                <div className="activity-list">
                  {selectedTicketTodos.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`activity-item it-todo-item ${
                        item.completed ? "is-complete" : ""
                      }`}
                      onClick={() => handleToggleTodoDone(selectedTicket._id, item.id)}
                    >
                      <strong>{item.summary}</strong>
                      <p>Action Button: {ACTION_LABELS[item.actionType]}</p>
                      <span>
                        {item.performed ? "Performed" : "Waiting for action"} •{" "}
                        {item.completed ? "Marked done" : "Click to mark done"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedTicket ? (
                <div className="it-resolve-help">
                  {canResolveTicket
                    ? "All tasks are completed. You can resolve this ticket now."
                    : "Perform the action first, then click the task here to strike it through."}
                </div>
              ) : null}
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <h3>Queue Snapshot</h3>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <strong>{approvedTickets.length} Approved</strong>
                  <p>Ready for IT to start.</p>
                </div>
                <div className="activity-item">
                  <strong>{inProgressTickets.length} In Progress</strong>
                  <p>Tickets currently being worked on.</p>
                </div>
                <div className="activity-item">
                  <strong>{resolvedTickets.length} Resolved</strong>
                  <p>Completed IT work items.</p>
                </div>
                <div className="activity-item">
                  <strong>{allTodoItems.length} To Do Tasks</strong>
                  <p>Tracked for the IT workflow on this device.</p>
                </div>
              </div>
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <h3>Recent Activity</h3>
              </div>

              {!recentActivity.length ? (
                <div className="dashboard-empty small-empty">No recent IT activity yet.</div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map((ticket) => (
                    <div key={ticket._id} className="activity-item">
                      <strong>{ticket.title}</strong>
                      <p>{ticket.resolutionNote || "Resolved by IT"}</p>
                      <span>{formatDate(ticket.updatedAt)}</span>
                    </div>
                  ))}
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
          <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
            <div className="notification-top">
              <h3>IT Notifications</h3>
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
                      setActiveTab("approved");
                      setSelectedTicketId(item.id);
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
                No new IT notifications right now.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showCreateAssetModal ? (
        <div className="modal-overlay" onClick={() => setShowCreateAssetModal(false)}>
          <div className="modal-card clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">IT Asset Management</p>
                <h2>Create Asset</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowCreateAssetModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAsset}>
              <div className="two-col-grid">
                <div>
                  <label className="field-label">Asset Name</label>
                  <input
                    className="field-input"
                    value={assetForm.assetName}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, assetName: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Asset Tag</label>
                  <input
                    className="field-input"
                    value={assetForm.assetTag}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, assetTag: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Category</label>
                  <select
                    className="field-input"
                    value={assetForm.category}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="PHONE">Phone</option>
                    <option value="TABLET">Tablet</option>
                    <option value="ACCESSORY">Accessory</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Serial Number</label>
                  <input
                    className="field-input"
                    value={assetForm.serialNumber}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, serialNumber: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Purchase Date</label>
                  <input
                    className="field-input"
                    type="date"
                    value={assetForm.purchaseDate}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, purchaseDate: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Condition</label>
                  <select
                    className="field-input"
                    value={assetForm.condition}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, condition: e.target.value }))
                    }
                  >
                    <option value="NEW">New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>
              </div>

              <label className="field-label">Notes</label>
              <textarea
                className="field-input"
                rows="4"
                value={assetForm.notes}
                onChange={(e) =>
                  setAssetForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />

              <div className="modal-actions">
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => setShowCreateAssetModal(false)}
                >
                  Cancel
                </button>
                <button className="primary-btn" type="submit" disabled={createAssetLoading}>
                  {createAssetLoading ? "Creating..." : "Create Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showTopAssignModal ? (
        <div className="modal-overlay" onClick={() => setShowTopAssignModal(false)}>
          <div className="modal-card clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">IT Asset Assignment</p>
                <h2>Pair Asset to Employee</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowTopAssignModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitTopAssign}>
              <div className="two-col-grid">
                <div>
                  <label className="field-label">Employee</label>
                  <select
                    className="field-input"
                    value={topAssignEmployeeId}
                    onChange={(e) => setTopAssignEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} • {employee.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Available Asset</label>
                  <select
                    className="field-input"
                    value={topAssignAssetId}
                    onChange={(e) => setTopAssignAssetId(e.target.value)}
                    required
                  >
                    <option value="">Select asset</option>
                    {availableAssets.map((asset) => (
                      <option key={asset._id} value={asset._id}>
                        {asset.assetName} • {asset.assetTag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => setShowTopAssignModal(false)}
                >
                  Cancel
                </button>
                <button className="primary-btn" type="submit" disabled={topAssignLoading}>
                  {topAssignLoading ? "Pairing..." : "Pair"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showTopUnassignModal ? (
        <div className="modal-overlay" onClick={() => setShowTopUnassignModal(false)}>
          <div className="modal-card clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">IT Asset Unassignment</p>
                <h2>Unassign Device</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowTopUnassignModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitTopUnassign}>
              <div className="two-col-grid">
                <div>
                  <label className="field-label">Employee</label>
                  <select
                    className="field-input"
                    value={topUnassignEmployeeId}
                    onChange={(e) => {
                      setTopUnassignEmployeeId(e.target.value);
                      setTopUnassignAssetId("");
                    }}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} • {employee.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Assigned Device</label>
                  <select
                    className="field-input"
                    value={topUnassignAssetId}
                    onChange={(e) => setTopUnassignAssetId(e.target.value)}
                    required
                    disabled={!topUnassignEmployeeId}
                  >
                    <option value="">
                      {topUnassignEmployeeId ? "Select assigned device" : "Choose employee first"}
                    </option>
                    {assignedAssetsForTopEmployee.map((asset) => (
                      <option key={asset._id} value={asset._id}>
                        {asset.assetName} • {asset.assetTag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => setShowTopUnassignModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" type="submit" disabled={topUnassignLoading}>
                  {topUnassignLoading ? "Unassigning..." : "Unassign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showAccountUpdateModal ? (
        <div className="modal-overlay" onClick={() => setShowAccountUpdateModal(false)}>
          <div className="modal-card clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">IT Employee Management</p>
                <h2>Account Update</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowAccountUpdateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitAccountUpdate}>
              <div className="two-col-grid">
                <div>
                  <label className="field-label">Employee ID</label>
                  <input
                    className="field-input"
                    value={accountUpdateForm.employeeId}
                    onChange={(e) =>
                      setAccountUpdateForm((prev) => ({
                        ...prev,
                        employeeId: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Email</label>
                  <input
                    className="field-input"
                    type="email"
                    value={accountUpdateForm.email}
                    onChange={(e) =>
                      setAccountUpdateForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Name</label>
                  <input
                    className="field-input"
                    value={accountUpdateForm.name}
                    onChange={(e) =>
                      setAccountUpdateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Department</label>
                  <input
                    className="field-input"
                    value={accountUpdateForm.department}
                    onChange={(e) =>
                      setAccountUpdateForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Job Title</label>
                  <input
                    className="field-input"
                    value={accountUpdateForm.jobTitle}
                    onChange={(e) =>
                      setAccountUpdateForm((prev) => ({
                        ...prev,
                        jobTitle: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Location</label>
                  <input
                    className="field-input"
                    value={accountUpdateForm.location}
                    onChange={(e) =>
                      setAccountUpdateForm((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => setShowAccountUpdateModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={accountUpdateLoading}
                >
                  {accountUpdateLoading ? "Updating..." : "Update Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDeleteConfirmModal ? (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirmModal(false)}>
          <div className="modal-card clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">IT Employee Management</p>
                <h2>Delete Account</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
              >
                ×
              </button>
            </div>

            <div className="description-box">
              <span>Employee</span>
              <p>
                <strong>{deleteTarget?.name || "Selected Employee"}</strong>
                <br />
                {deleteTarget?.email || "No email available"}
                <br />
                ID: {deleteTarget?.employeeId || "-"}
              </p>
            </div>

            <div className="description-box">
              <span>Warning</span>
              <p>This will permanently delete the employee account.</p>
            </div>

            <div className="modal-actions">
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={confirmAccountDeletion}
                disabled={accountDeleteLoading}
              >
                {accountDeleteLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}