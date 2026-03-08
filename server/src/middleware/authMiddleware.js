const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    req.user = user;

    next();
  } catch (err) {
    next(err);
  }
}

/*
Role-based authorization middleware
Usage example:
authorize("ADMIN")
authorize("ADMIN", "IT")
*/
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Not authorized"));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`Access denied. ${req.user.role} cannot access this resource`)
      );
    }

    next();
  };
}

module.exports = {
  protect,
  authorize,
};

