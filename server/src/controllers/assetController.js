const Asset = require("../models/Asset");
const User = require("../models/User");

/*
HR / IT
View all assets
*/
async function getAssets(req, res, next) {
  try {
    const { search, status, category } = req.query || {};

    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    if (search && search.trim()) {
      const keyword = search.trim();

      filter.$or = [
        { assetName: { $regex: keyword, $options: "i" } },
        { assetTag: { $regex: keyword, $options: "i" } },
        { serialNumber: { $regex: keyword, $options: "i" } },
      ];
    }

    const assets = await Asset.find(filter)
      .populate("assignedTo", "name email department jobTitle")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      count: assets.length,
      assets,
    });
  } catch (err) {
    next(err);
  }
}

/*
HR / IT
View single asset
*/
async function getAssetById(req, res, next) {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate("assignedTo", "name email department jobTitle");

    if (!asset) {
      res.status(404);
      throw new Error("Asset not found");
    }

    res.status(200).json({
      ok: true,
      asset,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Create new asset
*/
async function createAsset(req, res, next) {
  try {
    const { assetName, assetTag, category, serialNumber, purchaseDate, condition, notes } = req.body || {};

    if (!assetName || !assetTag || !category) {
      res.status(400);
      throw new Error("Asset name, tag, and category are required");
    }

    const asset = await Asset.create({
      assetName: assetName.trim(),
      assetTag: assetTag.trim(),
      category,
      serialNumber: serialNumber || "",
      purchaseDate: purchaseDate || null,
      condition: condition || "GOOD",
      notes: notes || "",
    });

    res.status(201).json({
      ok: true,
      message: "Asset created successfully",
      asset,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Assign asset to employee
*/
async function assignAsset(req, res, next) {
  try {
    const { employeeId } = req.body || {};

    if (!employeeId) {
      res.status(400);
      throw new Error("Employee ID is required");
    }

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      res.status(404);
      throw new Error("Asset not found");
    }

    if (asset.status === "ASSIGNED") {
      res.status(400);
      throw new Error("Asset already assigned");
    }

    const employee = await User.findById(employeeId);

    if (!employee ) {
      res.status(400);
      throw new Error("Invalid employee");
    }

    asset.assignedTo = employee._id;
    asset.status = "ASSIGNED";

    await asset.save();

    res.status(200).json({
      ok: true,
      message: "Asset assigned successfully",
      asset,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Unassign asset
*/
async function unassignAsset(req, res, next) {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      res.status(404);
      throw new Error("Asset not found");
    }

    asset.assignedTo = null;
    asset.status = "AVAILABLE";

    await asset.save();

    res.status(200).json({
      ok: true,
      message: "Asset unassigned successfully",
      asset,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  assignAsset,
  unassignAsset,
};