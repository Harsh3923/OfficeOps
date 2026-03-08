const express = require("express");
const {
  getAssets,
  getAssetById,
  createAsset,
  assignAsset,
  unassignAsset,
} = require("../controllers/assetController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/*
HR + IT can view assets
*/
router.get("/", protect, authorize("HR", "IT"), getAssets);
router.get("/:id", protect, authorize("HR", "IT"), getAssetById);

/*
IT manages assets
*/
router.post("/", protect, authorize("IT"), createAsset);
router.patch("/:id/assign", protect, authorize("IT"), assignAsset);
router.patch("/:id/unassign", protect, authorize("IT"), unassignAsset);

module.exports = router;