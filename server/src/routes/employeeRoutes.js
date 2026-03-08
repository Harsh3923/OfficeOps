const express = require("express");
const {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/*
HR and IT can view/search employees
*/
router.get("/", protect, authorize("HR", "IT"), getEmployees);
router.get("/:id", protect, authorize("HR", "IT"), getEmployeeById);

/*
IT execution actions
*/

router.patch("/:id", protect, authorize("IT"), updateEmployee);
router.delete("/:id", protect, authorize("IT"), deleteEmployee);

module.exports = router;