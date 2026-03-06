const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({ok: true, message: "OfficeOps Hub API is running"});
});

module.exports = router;