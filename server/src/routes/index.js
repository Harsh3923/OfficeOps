const express = require("express");

const authRoutes = require("./authRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({ok: true, message: "OfficeOps Hub API is running"});
});

router.use("/auth", authRoutes);

module.exports = router;