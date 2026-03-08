const express = require("express");

const authRoutes = require("./authRoutes");
const ticketRoutes = require("./ticketRoutes");
const employeeRoutes = require("./employeeRoutes");

const router = express.Router();
const assetRoutes = require("./assetRoutes");
const statsRoutes = require("./statsRoutes");

router.use("/assets", assetRoutes);
router.get("/health", (req, res) => {
  res.json({ ok: true, message: "OfficeOps Hub API is running" });
});

router.use("/auth", authRoutes);
router.use("/tickets", ticketRoutes);
router.use("/employees", employeeRoutes);
router.use("/stats", statsRoutes);
module.exports = router;