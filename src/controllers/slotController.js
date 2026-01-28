const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');


const checkOverlap = async (adminId, startTime, endTime, excludeSlotId = null) => {
  const query = {
    createdBy: adminId,
    $or: [
      // 1. New slot starts inside an existing slot
      { startTime: { $lt: endTime, $gte: startTime } },
      // 2. New slot ends inside an existing slot
      { endTime: { $gt: startTime, $lte: endTime } },
      // 3. New slot fully covers an existing slot
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } } 
    ]
  };

  // If we are updating a slot, we must exclude ITSELF from the check.
  // Otherwise, it will conflict with its own old time.
  if (excludeSlotId) {
    query._id = { $ne: excludeSlotId };
  }

  const existing = await Slot.findOne(query);
  return !!existing; // Returns true if overlap found, false if safe
};

// 1) POST /slots (ADMIN only)
exports.createSlot = async (req, res) => {
  try {
    const { startTime, endTime, capacity, tags } = req.body;
    const adminId = req.user._id; 

    // Basic Validation
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid time range.", 
        errors: ["startTime must be before endTime"] 
      });
    }
    if (capacity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid capacity.", 
        errors: ["Capacity must be at least 1"] 
      });
    }

    // --- INTEGRATION POINT 1: Check Overlap Before Create ---
    const hasOverlap = await checkOverlap(adminId, start, end);
    
    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: "Slot overlaps with an existing time.",
        errors: ["New slot time conflicts with an existing slot created by you."]
      });
    }

    const slot = new Slot({
      startTime: start,
      endTime: end,
      capacity,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: adminId
    });

    const savedSlot = await slot.save();
    return res.status(201).json(savedSlot);

  } catch (error) {
    console.error("Create Slot Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message || "An unexpected error occurred"] 
    });
  }
};

// 2) GET /slots (List)
exports.listSlots = async (req, res) => {
  try {
    let { page = 1, limit = 10, from, to, tags, availableOnly } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const query = {};

    if (from || to) {
      query.startTime = {};
      if (from) query.startTime.$gte = new Date(from);
      if (to) query.endTime = { $lte: new Date(to) };
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagList };
    }

    if (availableOnly === 'true') {
      query.$expr = { $lt: ["$bookedCount", "$capacity"] };
    }

    const slots = await Slot.find(query)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const response = slots.map(slot => ({
      ...slot,
      availableSeats: slot.capacity - (slot.bookedCount || 0)
    }));

    return res.status(200).json(response);
  } catch (error) {
    console.error("List Slots Error:", error);
    return res.status(400).json({ 
      success: false, 
      message: "Invalid query parameters.", 
      errors: ["Please check your query string inputs."] 
    });
  }
};

// 3) GET /slots/:id
exports.getSlotById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid ID format.", 
        errors: ["The provided ID is not a valid MongoDB ObjectId."] 
      });
    }
    const slot = await Slot.findById(req.params.id).lean();
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    slot.availableSeats = slot.capacity - (slot.bookedCount || 0);
    return res.status(200).json(slot);
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message || "An unexpected error occurred"] 
    });
  }
};

// 4) PATCH /slots/:id (Update)
exports.updateSlot = async (req, res) => {
  try {
    const { startTime, endTime, capacity, tags } = req.body;
    const slotId = req.params.id;
    const adminId = req.user._id;

    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ 
      success: false, 
      message: "Resource not found.", 
      errors: ["Slot not found with the provided ID."] 
    });

    // Authorization check
    if (slot.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied.", 
        errors: ["You can only update your own slots."] 
      });
    }

    // --- INTEGRATION POINT 2: Check Overlap Before Update ---
    if (startTime || endTime) {
      const newStart = startTime ? new Date(startTime) : slot.startTime;
      const newEnd = endTime ? new Date(endTime) : slot.endTime;

      if (newStart >= newEnd) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid time range.", 
          errors: ["startTime must be before endTime"] 
        });
      }

      // Note: We pass 'slotId' here to exclude the current slot from the check
      const hasOverlap = await checkOverlap(adminId, newStart, newEnd, slotId);
      
      if (hasOverlap) {
        return res.status(409).json({ 
          success: false, 
          message: "Conflict detected.", 
          errors: ["Updated time overlaps with another slot."] 
        });
      }

      slot.startTime = newStart;
      slot.endTime = newEnd;
    }
    // --------------------------------------------------------

    if (capacity !== undefined) {
      if (capacity < slot.bookedCount) {
        return res.status(409).json({
          success: false,
          message: "Capacity conflict.",
          errors: [`Cannot reduce capacity to ${capacity} because ${slot.bookedCount} candidates are already booked.`]
        });
      }
      slot.capacity = capacity;
    }

    if (tags) slot.tags = tags;

    await slot.save();
    return res.status(200).json(slot);

  } catch (error) {
    console.error("Update Slot Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message || "An unexpected error occurred"] 
    });
  }
};

// 5) DELETE /slots/:id
exports.deleteSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const slot = await Slot.findById(slotId);
    
    if (!slot) return res.status(404).json({ 
      success: false, 
      message: "Resource not found.", 
      errors: ["Slot not found with the provided ID."] 
    });
    
    // Authorization
    if (slot.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied.", 
        errors: ["Not authorized to delete this slot."] 
      });
    }

    if (slot.bookedCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Deletion conflict.",
        errors: ["Cannot delete slot because it has active bookings."]
      });
    }

    await Slot.findByIdAndDelete(slotId);
    return res.status(200).json({ message: "Slot deleted successfully" });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message || "An unexpected error occurred"] 
    });
  }
};