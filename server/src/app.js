const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// 1) Middleware that lets your server read JSON bodies
app.use(express.json());

// 2) Middleware that lets your server read cookies
app.use(cookieParser());

// 3) CORS allows your React frontend to talk to this backend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Health check route (quick test)
app.use("/api", apiRoutes);


app.use(notFound);
app.use(errorHandler);

module.exports = app;