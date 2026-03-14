# OfficeOps Hub

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)

A full-stack internal office management system that streamlines employee requests, IT support tickets, and asset allocation through a structured three-tier approval workflow involving **Employees**, **HR**, and **IT** teams.

---

## Table of Contents

- [Purpose](#purpose)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Three-Tier Workflow](#three-tier-workflow)
- [Project Structure](#project-structure)
- [Backend Architecture](#backend-architecture)
  - [Models](#models)
  - [Controllers](#controllers)
  - [Routes](#routes)
  - [Middleware](#middleware)
  - [Utilities](#utilities)
- [API Reference](#api-reference)
- [Frontend Architecture](#frontend-architecture)
- [Environment Variables](#environment-variables)
- [How to Run](#how-to-run)
- [Security Notes](#security-notes)

---

## Purpose

OfficeOps Hub solves the problem of untracked, informal office requests. Instead of employees emailing HR or IT directly, all requests go through a standardized ticketing system:

1. An **Employee** submits a ticket (tech support, asset request, account change, etc.)
2. **HR** reviews and approves or rejects the ticket with a comment
3. **IT** receives approved tickets, executes the required operations, and resolves the ticket

Every step is logged, notified, and visible to all relevant parties — eliminating ambiguity and creating a full audit trail.

---

## Screenshots

> Place your screenshots in a `/screenshots` folder at the root of the project and reference them below.

### Login Page
<!-- ![Login Page](./screenshots/login.png) -->

### Employee Dashboard
<!-- ![Employee Dashboard](./screenshots/employee-dashboard.png) -->

### HR Dashboard — Ticket Queue
<!-- ![HR Dashboard](./screenshots/hr-dashboard.png) -->

### IT Dashboard — Execution Panel
<!-- ![IT Dashboard](./screenshots/it-dashboard.png) -->

### Ticket Detail View
<!-- ![Ticket Detail](./screenshots/ticket-detail.png) -->

### Notification Panel
<!-- ![Notifications](./screenshots/notifications.png) -->

> **To add screenshots:** Take screenshots of the running application, save them as PNG files inside a `./screenshots/` folder at the root of the project, then remove the `<!--` and `-->` comment wrappers from the lines above.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend Framework | Express.js 5.x |
| Database | MongoDB (Mongoose 9.x) |
| Authentication | JWT (jsonwebtoken) + bcrypt |
| Email | Nodemailer (Gmail SMTP) |
| File Uploads | Multer |
| Frontend | React 19 + React Router DOM 6 |
| Build Tool | Vite 6 |
| HTTP Client | Axios |

---

## Features

### For Employees
- Submit tickets across request types: Tech Support, Asset Request, Account Update, Account Deletion, Access Request, and more
- Attach files to tickets (PNG, JPG, PDF, TXT — up to 5MB each)
- Track ticket status through the full lifecycle
- View full activity logs and comment threads per ticket
- Auto-save ticket drafts to `localStorage` so progress is never lost
- Resubmit rejected tickets after making changes
- Real-time notification bell with unread count

### For HR
- Dedicated queue view filtered by ticket status (Pending, Approved, Rejected, Resolved)
- Approve tickets with optional comments
- Reject tickets with a mandatory reason (visible to the employee)
- Employee directory sidebar for quick reference
- Full activity log per ticket

### For IT
- View queue of HR-approved tickets ready for execution
- Start working on tickets, then resolve them with resolution notes
- Execute structured operations directly from the dashboard:
  - **Asset Assignment** — assign an asset to an employee
  - **Asset Unassignment** — remove an asset from an employee
  - **Account Update** — update an employee's profile fields
  - **Account Deletion** — permanently delete an employee account
- Create and manage asset inventory (laptops, monitors, phones, accessories, etc.)
- Built-in personal TODO list for task tracking

### System-wide
- Email-verified signup with 6-digit OTP (10-minute expiry, resendable)
- Password reset via email with verification code
- Role-based access control (Employee / HR / IT)
- HttpOnly JWT cookies (7-day expiry)
- Notification system with per-notification and bulk read controls
- Full audit trail: every ticket action is logged with timestamp, actor, role, and note
- Ticket comments with role-tagged messages

---

## Three-Tier Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  EMPLOYEE ──creates──► TICKET (status: PENDING_HR)         │
│                             │                               │
│                             ▼                               │
│              HR reviews ticket                              │
│                    ├── Rejects ──► status: REJECTED_BY_HR   │
│                    │                    │                   │
│                    │              Employee can resubmit      │
│                    │                                        │
│                    └── Approves ──► status: APPROVED_BY_HR  │
│                                          │                  │
│                                          ▼                  │
│                             IT starts work                  │
│                             status: IN_PROGRESS_BY_IT       │
│                                          │                  │
│                                          ▼                  │
│                             IT executes & resolves          │
│                             status: RESOLVED                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

At each stage, the relevant parties receive in-app notifications and email alerts.

---

## Project Structure

```
OfficeOps/
│
├── client/                          # React frontend (Vite)
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx                 # React entry point
│       ├── App.jsx                  # Router & route definitions
│       ├── context/
│       │   └── AuthContext.jsx      # Global auth state & methods
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx   # Redirects unauthenticated users
│       │   └── RoleRoute.jsx        # Redirects unauthorized roles
│       ├── services/
│       │   └── api.js               # Axios instance with base URL & credentials
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── VerifyOtpPage.jsx
│       │   ├── ForgotPasswordPage.jsx
│       │   ├── ResetPasswordPage.jsx
│       │   ├── UnauthorizedPage.jsx
│       │   ├── employee/
│       │   │   └── EmployeeDashboard.jsx
│       │   ├── hr/
│       │   │   └── HRDashboard.jsx
│       │   └── it/
│       │       └── ITDashboard.jsx
│       └── styles/
│           ├── dashboard.css
│           ├── employeeDashboard.css
│           ├── hrDashboard.css
│           └── itDashboard.css
│
└── server/                          # Node.js + Express backend
    ├── .env                         # Environment variables (never commit)
    ├── package.json
    └── src/
        ├── server.js                # Entry point — starts HTTP server
        ├── app.js                   # Express app setup — CORS, cookies, routes
        ├── config/
        │   └── db.js                # MongoDB connection via Mongoose
        ├── models/
        │   ├── User.js
        │   ├── Ticket.js
        │   ├── Asset.js
        │   ├── Notification.js
        │   ├── PendingUser.js
        │   └── PasswordResetRequest.js
        ├── controllers/
        │   ├── authController.js
        │   ├── ticketController.js
        │   ├── assetController.js
        │   ├── employeeController.js
        │   ├── notificationController.js
        │   └── statsController.js
        ├── routes/
        │   ├── index.js             # Mounts all sub-routers under /api
        │   ├── authRoutes.js
        │   ├── ticketRoutes.js
        │   ├── assetRoutes.js
        │   ├── employeeRoutes.js
        │   ├── notificationRoutes.js
        │   └── statsRoutes.js
        ├── middleware/
        │   ├── authMiddleware.js    # JWT verification + role authorization
        │   ├── errorHandler.js      # 404 catcher + global error formatter
        │   └── uploadMiddleware.js  # Multer config for file uploads
        └── utils/
            ├── generateToken.js
            ├── generateVerificationCode.js
            ├── sendEmail.js
            └── createNotification.js
```

---

## Backend Architecture

### Models

All models live in `server/src/models/` and use Mongoose schemas with timestamps enabled.

---

#### `User.js`
Represents verified, active users of the system.

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `password` | String | Hashed with bcrypt |
| `role` | Enum | `"EMPLOYEE"` / `"HR"` / `"IT"` |
| `isVerified` | Boolean | Defaults to `true` for direct creates |
| `department` | String | Optional |
| `jobTitle` | String | Optional |
| `location` | String | Optional |

---

#### `Ticket.js`
The core entity of the system. Every employee request becomes a ticket.

| Field | Type | Notes |
|---|---|---|
| `title` | String | Required |
| `description` | String | Required |
| `requestType` | Enum | `TECH_SUPPORT`, `ASSET_REQUEST`, `ACCOUNT_UPDATE`, `ACCOUNT_DELETION`, `ACCESS_REQUEST`, `ASSET_ASSIGNMENT`, `ASSET_UNASSIGNMENT`, `OTHER` |
| `status` | Enum | `PENDING_HR` → `APPROVED_BY_HR` / `REJECTED_BY_HR` → `IN_PROGRESS_BY_IT` → `RESOLVED` |
| `priority` | Enum | `LOW` / `MEDIUM` / `HIGH` |
| `requestedChanges` | Mixed | Flexible JSON payload for structured IT operations |
| `createdBy` | ObjectId | Ref: User (employee) |
| `hrReviewedBy` | ObjectId | Ref: User (HR staff) |
| `itHandledBy` | ObjectId | Ref: User (IT staff) |
| `hrComment` | String | HR's approval/rejection note |
| `resolutionNote` | String | IT's final resolution summary |
| `comments` | Array | Thread of messages from any role |
| `attachments` | Array | Uploaded files with metadata |
| `activityLog` | Array | Full audit trail of every action taken |

---

#### `Asset.js`
Tracks physical or digital assets owned by the organization.

| Field | Type | Notes |
|---|---|---|
| `assetName` | String | Required |
| `assetTag` | String | Required, unique identifier |
| `category` | Enum | `LAPTOP`, `MONITOR`, `PHONE`, `TABLET`, `ACCESSORY`, `OTHER` |
| `serialNumber` | String | Optional |
| `status` | Enum | `AVAILABLE`, `ASSIGNED`, `MAINTENANCE`, `RETIRED` |
| `assignedTo` | ObjectId | Ref: User (null if unassigned) |
| `purchaseDate` | Date | Optional |
| `condition` | Enum | `NEW`, `GOOD`, `FAIR`, `DAMAGED` |

---

#### `Notification.js`
Drives the in-app notification bell. Optimized with compound indexes for fast unread queries.

| Field | Type | Notes |
|---|---|---|
| `recipient` | ObjectId | Ref: User |
| `sender` | ObjectId | Ref: User |
| `ticket` | ObjectId | Ref: Ticket |
| `type` | Enum | `TICKET_CREATED`, `TICKET_APPROVED`, `TICKET_REJECTED`, `TICKET_RESOLVED`, `COMMENT_ADDED`, etc. |
| `title` | String | Max 120 chars |
| `message` | String | Max 500 chars |
| `isRead` | Boolean | Defaults to `false` |
| `readAt` | Date | Set when marked as read |

Indexes: `{recipient, isRead, createdAt}` and `{recipient, createdAt}`

---

#### `PendingUser.js`
Temporary record created during signup. Deleted once the user verifies their email.

| Field | Type | Notes |
|---|---|---|
| `name` | String | |
| `email` | String | Unique |
| `password` | String | Pre-hashed |
| `verificationCode` | String | 6-digit OTP |
| `verificationCodeExpiresAt` | Date | 10 minutes from creation |
| `role` | Enum | Default: `"EMPLOYEE"` |

---

#### `PasswordResetRequest.js`
Temporary record for in-progress password resets.

| Field | Type | Notes |
|---|---|---|
| `email` | String | Unique |
| `verificationCode` | String | 6-digit OTP |
| `verificationCodeExpiresAt` | Date | 10 minutes from creation |

---

### Controllers

Controllers contain all the business logic. Each function handles exactly one operation and is mapped to a route.

---

#### `authController.js`
Handles the complete authentication lifecycle.

- **`login`** — Validates credentials, compares hashed password, generates JWT, sets HttpOnly cookie
- **`logout`** — Clears the auth cookie
- **`getMe`** — Returns the currently authenticated user's profile
- **`startSignup`** — Validates new email, hashes password, creates `PendingUser`, sends OTP email
- **`verifySignup`** — Validates OTP and expiry, creates `User` from `PendingUser`, deletes pending record
- **`resendSignupCode`** — Regenerates OTP and resends verification email
- **`startPasswordReset`** — Checks email exists in `User`, creates `PasswordResetRequest`, sends OTP
- **`verifyResetCode`** — Validates reset OTP
- **`resendResetCode`** — Regenerates and resends reset OTP
- **`confirmPasswordReset`** — Hashes new password, updates `User`, deletes reset record

---

#### `ticketController.js`
Manages the full ticket lifecycle across all three roles.

- **`createTicket`** — Creates ticket as `PENDING_HR`, handles file attachments, logs activity, notifies HR
- **`getTickets`** — Returns paginated, filterable ticket list (automatically filtered by role)
- **`getTicketById`** — Returns full ticket with populated references
- **`getTicketHistory`** — Returns the `activityLog` array
- **`getTicketComments`** — Returns the `comments` array
- **`addComment`** — Appends comment with sender's role tag, logs activity, sends notification
- **`getAttachments`** — Returns attachment metadata list
- **`addAttachment`** — Uploads file via Multer, appends to `attachments`, notifies parties
- **`getDashboardSummary`** — Returns ticket counts grouped by status for the requesting user
- **`getHRQueue`** — Returns tickets in HR-relevant statuses
- **`getITQueue`** — Returns tickets in IT-relevant statuses
- **`getMyOpenTickets`** — Returns the employee's own open tickets
- **`approveTicket`** — Sets status to `APPROVED_BY_HR`, records HR actor, notifies IT + Employee
- **`rejectTicket`** — Sets status to `REJECTED_BY_HR`, requires `hrComment`, notifies Employee
- **`resubmitTicket`** — Resets rejected ticket back to `PENDING_HR`, logs resubmission, notifies HR
- **`startTicket`** — IT sets status to `IN_PROGRESS_BY_IT`, records IT actor, notifies Employee
- **`resolveTicket`** — IT sets status to `RESOLVED`, saves resolution note, notifies Employee + HR
- **`executeTicket`** — IT executes the structured `requestedChanges` payload:
  - `ASSET_ASSIGNMENT` → finds available asset, sets `assignedTo`, updates `Asset.status`
  - `ASSET_UNASSIGNMENT` → clears `assignedTo`, sets asset back to `AVAILABLE`
  - `ACCOUNT_UPDATE` → updates specified fields on the target `User`
  - `ACCOUNT_DELETION` → deletes target `User` from the database

---

#### `assetController.js`
Manages the asset inventory.

- **`getAssets`** — Returns assets with optional filters (status, category, assignedTo)
- **`getAssetById`** — Returns single asset with populated `assignedTo`
- **`createAsset`** — Creates new asset record (IT only)
- **`assignAsset`** — Assigns asset to a user, sets status to `ASSIGNED`
- **`unassignAsset`** — Clears assignment, sets status back to `AVAILABLE`

---

#### `employeeController.js`
Provides HR and IT with a read/write view of the employee directory.

- **`getEmployees`** — Returns users with `role: EMPLOYEE` with optional search
- **`getEmployeeById`** — Returns single employee profile
- **`updateEmployee`** — Updates employee's `name`, `department`, `jobTitle`, `location`
- **`deleteEmployee`** — Deletes employee account (IT only, irreversible)

---

#### `notificationController.js`
Drives the notification bell UI.

- **`getNotifications`** — Returns paginated notifications for the authenticated user
- **`getUnreadCount`** — Returns count of `isRead: false` notifications
- **`markAsRead`** — Sets `isRead: true` and `readAt` timestamp on one notification
- **`markAllAsRead`** — Bulk updates all unread notifications for the user

---

#### `statsController.js`
Aggregates counts for the HR/IT overview dashboard.

- **`getStats`** — Returns:
  - User counts: total employees, HR staff, IT staff
  - Asset counts: total, assigned, available
  - Ticket counts: pending HR review, in-progress by IT, resolved

---

### Routes

Routes in `server/src/routes/` map HTTP methods and paths to controller functions, applying middleware as needed.

#### `index.js` — Master Router
Mounts all sub-routers under `/api`:
```
/api/auth          → authRoutes
/api/tickets       → ticketRoutes
/api/assets        → assetRoutes
/api/employees     → employeeRoutes
/api/notifications → notificationRoutes
/api/stats         → statsRoutes
/api/health        → { ok: true }
```

#### `authRoutes.js`
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me                        [protect]
POST   /api/auth/signup/start
POST   /api/auth/signup/verify
POST   /api/auth/signup/resend
POST   /api/auth/password-reset/start
POST   /api/auth/password-reset/verify
POST   /api/auth/password-reset/resend
POST   /api/auth/password-reset/confirm
```

#### `ticketRoutes.js`
```
GET    /api/tickets                        [protect]
GET    /api/tickets/dashboard/summary      [protect]
GET    /api/tickets/hr/queue               [protect, authorize("HR")]
GET    /api/tickets/it/queue               [protect, authorize("IT")]
GET    /api/tickets/my/open                [protect, authorize("EMPLOYEE")]
POST   /api/tickets                        [protect, authorize("EMPLOYEE"), upload]
GET    /api/tickets/:id                    [protect]
GET    /api/tickets/:id/history            [protect]
GET    /api/tickets/:id/comments           [protect]
POST   /api/tickets/:id/comment            [protect]
GET    /api/tickets/:id/attachments        [protect]
POST   /api/tickets/:id/attachments        [protect, upload]
PATCH  /api/tickets/:id/approve            [protect, authorize("HR")]
PATCH  /api/tickets/:id/reject             [protect, authorize("HR")]
PATCH  /api/tickets/:id/resubmit           [protect, authorize("EMPLOYEE")]
PATCH  /api/tickets/:id/start              [protect, authorize("IT")]
PATCH  /api/tickets/:id/resolve            [protect, authorize("IT")]
PATCH  /api/tickets/:id/execute            [protect, authorize("IT")]
```

#### `assetRoutes.js`
```
GET    /api/assets                         [protect, authorize("HR", "IT")]
GET    /api/assets/:id                     [protect, authorize("HR", "IT")]
POST   /api/assets                         [protect, authorize("IT")]
PATCH  /api/assets/:id/assign              [protect, authorize("IT")]
PATCH  /api/assets/:id/unassign            [protect, authorize("IT")]
```

#### `employeeRoutes.js`
```
GET    /api/employees                      [protect, authorize("HR", "IT")]
GET    /api/employees/:id                  [protect, authorize("HR", "IT")]
PATCH  /api/employees/:id                  [protect, authorize("IT")]
DELETE /api/employees/:id                  [protect, authorize("IT")]
```

#### `notificationRoutes.js`
```
GET    /api/notifications                  [protect]
GET    /api/notifications/unread-count     [protect]
PATCH  /api/notifications/:id/read         [protect]
PATCH  /api/notifications/read-all         [protect]
```

#### `statsRoutes.js`
```
GET    /api/stats                          [protect, authorize("HR", "IT")]
```

---

### Middleware

#### `authMiddleware.js`

**`protect`**
Runs on every protected route. Reads the JWT from the `token` cookie, verifies it with `JWT_SECRET`, fetches the matching user from MongoDB (excluding the password field), and attaches the user object to `req.user`. Returns `401` if the token is missing, invalid, or the user no longer exists.

**`authorize(...roles)`**
A higher-order function that returns a middleware. Checks whether `req.user.role` is included in the allowed roles array. Returns `403 Forbidden` if not. Always used after `protect`.

```js
// Example usage in a route file
router.patch("/:id/approve", protect, authorize("HR"), approveTicket);
router.get("/", protect, authorize("HR", "IT"), getAssets);
```

---

#### `errorHandler.js`

**`notFound`**
A catch-all middleware placed after all routes. Fires for any request that didn't match a defined route and forwards a 404 error to the error handler.

**`errorHandler`**
The global Express error-handling middleware (4-argument signature). Formats all errors into a consistent JSON shape:
```json
{
  "ok": false,
  "message": "Error description here"
}
```

---

#### `uploadMiddleware.js`

Configures Multer for ticket file attachments.

| Setting | Value |
|---|---|
| Storage location | `server/src/uploads/tickets/` |
| Filename format | `{Date.now()}-{originalname}` |
| Allowed MIME types | `image/png`, `image/jpg`, `image/jpeg`, `application/pdf`, `text/plain` |
| Max file size | 5MB |
| Exported as | `uploadTicketAttachment` |

---

### Utilities

Small, single-purpose helper functions in `server/src/utils/`.

#### `generateToken.js`
Creates a signed JWT containing the user's `_id`. Expiry: 7 days.

#### `generateVerificationCode.js`
Returns a random 6-digit string used for email OTP codes.

#### `sendEmail.js`
Sends a plain-text email using Nodemailer with Gmail SMTP. Reads credentials from `EMAIL_USER` and `EMAIL_PASS` environment variables.
```js
await sendEmail(to, subject, text)
```

#### `createNotification.js`
Creates and saves a `Notification` document. Called from controllers after every significant ticket state change.
```js
await createNotification({ recipient, sender, ticket, type, title, message })
```

---

## API Reference

### Health Check
```
GET /api/health
→ { ok: true, message: "OfficeOps Hub API is running" }
```

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, returns JWT cookie |
| POST | `/api/auth/logout` | — | Clears JWT cookie |
| GET | `/api/auth/me` | ✓ | Get current user profile |
| POST | `/api/auth/signup/start` | — | Begin signup, send OTP |
| POST | `/api/auth/signup/verify` | — | Verify OTP, create account |
| POST | `/api/auth/signup/resend` | — | Resend signup OTP |
| POST | `/api/auth/password-reset/start` | — | Send reset OTP to email |
| POST | `/api/auth/password-reset/verify` | — | Verify reset OTP |
| POST | `/api/auth/password-reset/confirm` | — | Set new password |

### Tickets
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/tickets` | All | List tickets (auto-filtered by role) |
| POST | `/api/tickets` | Employee | Create ticket |
| GET | `/api/tickets/dashboard/summary` | All | Status count summary |
| GET | `/api/tickets/hr/queue` | HR | HR review queue |
| GET | `/api/tickets/it/queue` | IT | IT execution queue |
| GET | `/api/tickets/my/open` | Employee | My open tickets |
| GET | `/api/tickets/:id` | All | Ticket detail |
| GET | `/api/tickets/:id/history` | All | Activity log |
| POST | `/api/tickets/:id/comment` | All | Add comment |
| POST | `/api/tickets/:id/attachments` | All | Upload file |
| PATCH | `/api/tickets/:id/approve` | HR | Approve ticket |
| PATCH | `/api/tickets/:id/reject` | HR | Reject with reason |
| PATCH | `/api/tickets/:id/resubmit` | Employee | Resubmit rejected ticket |
| PATCH | `/api/tickets/:id/start` | IT | Start working |
| PATCH | `/api/tickets/:id/resolve` | IT | Resolve ticket |
| PATCH | `/api/tickets/:id/execute` | IT | Execute structured operation |

### Assets
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/assets` | HR, IT | List all assets |
| GET | `/api/assets/:id` | HR, IT | Asset detail |
| POST | `/api/assets` | IT | Create asset |
| PATCH | `/api/assets/:id/assign` | IT | Assign to employee |
| PATCH | `/api/assets/:id/unassign` | IT | Unassign asset |

### Employees
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/employees` | HR, IT | List employees |
| GET | `/api/employees/:id` | HR, IT | Employee details |
| PATCH | `/api/employees/:id` | IT | Update profile |
| DELETE | `/api/employees/:id` | IT | Delete account |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | Get paginated notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark one as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

### Stats
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/stats` | HR, IT | Aggregated dashboard stats |

---

## Frontend Architecture

The frontend is a React 19 SPA built with Vite.

### Auth Context (`context/AuthContext.jsx`)
Provides global auth state to the entire component tree via React Context. Exposes:
- `user` — current user object (`null` if not logged in)
- `isAuthenticated` — boolean
- `authLoading` — `true` during initial session check on mount
- `login(email, password)` — calls `/api/auth/login`, updates state
- `logout()` — calls `/api/auth/logout`, clears state
- `fetchMe()` — re-fetches current user (used after profile changes)

### Route Guards
- **`ProtectedRoute`** — wraps any route requiring a logged-in user; redirects to `/login` if not authenticated
- **`RoleRoute`** — wraps role-specific routes; redirects to `/unauthorized` if the user's role doesn't match

### API Service (`services/api.js`)
Pre-configured Axios instance pointing to `http://localhost:5000`. Has `withCredentials: true` set globally so JWT cookies are sent automatically on every request.

### Pages

| Page | Route | Access |
|---|---|---|
| LoginPage | `/login` | Public |
| SignupPage | `/signup` | Public |
| VerifyOtpPage | `/verify-otp` | Public |
| ForgotPasswordPage | `/forgot-password` | Public |
| ResetPasswordPage | `/reset-password` | Public |
| UnauthorizedPage | `/unauthorized` | Public |
| EmployeeDashboard | `/employee` | Employee only |
| HRDashboard | `/hr` | HR only |
| ITDashboard | `/it` | IT only |

---

## Environment Variables

Create a `.env` file inside the `server/` directory:

```env
# Server
PORT=5000

# Database
MONGO_URI=mongodb://127.0.0.1:27017/officeops_hub

# JWT
JWT_SECRET=your_long_random_secret_key_here

# Email (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> **Gmail App Password:** Use an [App Password](https://myaccount.google.com/apppasswords), not your regular Gmail password. Enable 2-Step Verification on your Google account first, then generate an App Password for this project.

> **Security:** Add `server/.env` to your `.gitignore`. Never commit real credentials.

---

## How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally on port `27017`
- A Gmail account with an App Password configured

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/OfficeOps.git
cd OfficeOps
```

### 2. Configure the Backend
```bash
cd server
npm install
```

Create `server/.env` and fill in your values (see [Environment Variables](#environment-variables) above).

```bash
npm run dev
# Server running at http://localhost:5000
```

### 3. Start the Frontend
Open a new terminal:
```bash
cd client
npm install
npm run dev
# Client running at http://localhost:5173
```

### 4. Open the App
Visit `http://localhost:5173` in your browser.

### First-Time Setup
1. Go to `/signup`, register with your email, and enter the OTP you receive
2. By default, new signups are created as `EMPLOYEE`
3. To create **HR** or **IT** accounts, use MongoDB Compass or the shell to manually set the `role` field on an existing user document:
   ```js
   db.users.updateOne({ email: "hr@example.com" }, { $set: { role: "HR" } })
   ```

### Available Scripts

**Backend (`server/`)**

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Start with nodemon (auto-reload on save) |
| Production | `npm start` | Start with node |

**Frontend (`client/`)**

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Start Vite dev server with HMR |
| Build | `npm run build` | Produce optimized build in `dist/` |
| Preview | `npm run preview` | Preview production build locally |

---

## Security Notes

- JWT tokens are stored in **HttpOnly cookies** — inaccessible to JavaScript (XSS protection)
- Passwords are hashed with **bcrypt** before storage — never stored in plain text
- File uploads are validated by MIME type and capped at **5MB**
- CORS is restricted to the frontend origin only (`http://localhost:5173`)
- OTP codes expire in **10 minutes** and are permanently deleted after successful use
- All routes requiring authentication and authorization are protected at the middleware level — no business logic runs before identity is verified
