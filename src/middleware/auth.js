const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * 1. Authenticate Middleware (x-user-id Header)
 * Checks if the request has a valid MongoID in 'x-user-id'.
 * If valid, it attaches the user object to req.user.
 */
exports.authenticate = async (req, res, next) => {
  try {
    // 1. Get the ID from the header
    const userId = req.header('x-user-id');
    
    // 2. Validate format
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication failed.",
        errors: ["Missing or invalid 'x-user-id' header."]
      });
    }

    // 3. Fetch User from DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication failed.",
        errors: ["User not found with the provided ID."]
      });
    }

    // 4. Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error("Auth Error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      errors: ["An unexpected error occurred during authentication."]
    });
  }
};

/**
 * 2. Authorize Middleware (Role Check)
 * Remains the same, as it relies on req.user which we just populated.
 */
exports.authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication failed.",
        errors: ["User context is missing."]
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied.", 
        errors: [`You must be an ${requiredRole} to access this resource.`]
      });
    }

    next();
  };
};