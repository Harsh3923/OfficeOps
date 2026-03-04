const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// 1) Middleware that lets server read JSON bodies
app.use(express.json());

// 2) Middleware that lets server read cookies
app.use(cookieParser());

// 3) CORS allows React frontend to talk to this backend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Health check route (quick test)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "OfficeOps Hub API is running" });
});

module.exports = app;