const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// All API routes live under /api
app.use("/api", apiRoutes);

// Error handling (keep at the bottom)
app.use(notFound);
app.use(errorHandler);

module.exports = app;