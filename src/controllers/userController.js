const User = require('../models/User');

// 1) POST /users - Create a user
exports.createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: ["name, email, and role are required fields"]
      });
    }

    const validRoles = ['ADMIN', 'CANDIDATE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role.", 
        errors: ["Role must be either ADMIN or CANDIDATE."] 
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format.", 
        errors: ["Please provide a valid email address (e.g., user@example.com)."] 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: "User registration failed.", 
        errors: ["User with this email already exists."] 
      });
    }

    const newUser = new User({ name, email, role });
    const savedUser = await newUser.save();

    return res.status(201).json(savedUser);

  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: "User registration failed.", 
        errors: ["User with this email already exists."] 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message] 
    });
  }
};

// 2) GET /users - List users
exports.listUsers = async (req, res) => {
  try {
    const { role, email } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (email) filter.email = { $regex: email, $options: 'i' };

    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(users);

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message || "An unexpected error occurred"] 
    });
  }
};