const User = require("../models/User");
const Ticket = require("../models/Ticket");

/*
HR / IT
Get all employees
Supports search by name/email/department/jobTitle/location
*/
async function getEmployees(req, res, next) {
  try {
    const { search } = req.query || {};

    const filter = {
      role: { $ne: "HR" },
    };

    if (search && search.trim()) {
      const keyword = search.trim();
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { department: { $regex: keyword, $options: "i" } },
        { jobTitle: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
      ];
    }

    const employees = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      count: employees.length,
      employees,
    });
  } catch (err) {
    next(err);
  }
}

/*
HR / IT
Get single employee
*/
async function getEmployeeById(req, res, next) {
  try {
    const employee = await User.findById(req.params.id)
      .select("-password")

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    res.status(200).json({
      ok: true,
      employee,
    });
  } catch (err) {
    next(err);
  }
}



/*
IT
Edit employee account info
*/
async function updateEmployee(req, res, next) {
  try {
    const { name, department, jobTitle, location, email } = req.body || {};

    const employee = await User.findById(req.params.id);

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    if (employee.role !== "EMPLOYEE") {
      res.status(400);
      throw new Error("Only employee accounts can be updated here");
    }

    if (name !== undefined) employee.name = String(name).trim();
    if (department !== undefined) employee.department = String(department).trim();
    if (jobTitle !== undefined) employee.jobTitle = String(jobTitle).trim();
    if (location !== undefined) employee.location = String(location).trim();
    if (email !== undefined) employee.email = String(email).trim().toLowerCase();

    await employee.save();

    const updatedEmployee = await User.findById(employee._id)
      .select("-password")

    res.status(200).json({
      ok: true,
      message: "Employee account updated successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    next(err);
  }
}

/*
IT
Delete employee account
*/
async function deleteEmployee(req, res, next) {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    if (employee.role !== "EMPLOYEE") {
      res.status(400);
      throw new Error("Only employee accounts can be deleted here");
    }

    await Ticket.deleteMany({ createdBy: employee._id });
    await User.deleteOne({ _id: employee._id });

    res.status(200).json({
      ok: true,
      message: "Employee account deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};