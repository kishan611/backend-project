const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

// 1) POST /bookings (CANDIDATE only)
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { slotId } = req.body;
    const candidateId = req.user._id; 

    // 0. Validation: Invalid ID format
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: "Invalid ID format.", 
          errors: ["The provided slotId is not a valid MongoDB ObjectId."] 
        });
    }

    // 1. Check if candidate already booked (Fast Fail)
    // We check this first to avoid locking the slot if they already have a booking.
    const existingBooking = await Booking.findOne({ slotId, candidateId });
    if (existingBooking) {
        if (existingBooking.status === 'BOOKED') {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
              success: false,
              message: "Duplicate booking detected.",
              errors: ["Candidate has already booked this slot."]
          });
        }
    }

    // 2. Atomically increment bookedCount ONLY if it is less than capacity
    const updatedSlot = await Slot.findOneAndUpdate(
      { _id: slotId, $expr: { $lt: ["$bookedCount", "$capacity"] } },
      { $inc: { bookedCount: 1 } },
      { session, new: true }
    );

    if (!updatedSlot) {
      await session.abortTransaction();
      session.endSession();
      
      // Determine if it was 404 (Not Found) or 409 (Full)
      const slotExists = await Slot.exists({ _id: slotId });
      if (slotExists) {
        return res.status(409).json({
          success: false,
          message: "Slot capacity exceeded.",
          errors: ["No seats available in this slot."]
      });
      }
      return res.status(404).json({ 
        success: false, 
        message: "Resource not found.", 
        errors: ["Slot not found with the provided ID."] 
      });

    }

    // 3. Create the Booking
    await Booking.create([{ slotId, candidateId, status: 'BOOKED' }], { session });

    await session.commitTransaction();
    session.endSession();
    return res.status(201).json({ message: "Booked successfully" });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Booking Transaction Error:", error);

    // Handle Mongoose Duplicate Key Error (Race condition safety net)
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: "Duplicate booking detected.", 
        errors: ["You have already booked this slot."] 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      errors: [error.message || "An unexpected error occurred"] 
    });
  }
};

// 2) GET /bookings/my (List my bookings)
exports.listMyBookings = async (req, res) => {
  try {
    // 1. Identify the user (populated by your 'x-user-id' middleware)
    const candidateId = req.user.userId;
    
    const { status, from, to } = req.query; 

    const query = { candidateId };

    // --- Status Filter ---
    if (status) {
      const validStatuses = ['BOOKED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid query parameters.", 
            errors: ["Status must be either BOOKED or CANCELLED."] 
        });
      }
      query.status = status;
    }

    // Fetch bookings and populate slot details
    const bookings = await Booking.find(query)
      .populate('slotId')
      .sort({ createdAt: -1 })
      .lean();

    let filteredBookings = bookings;

    if (from || to) {
      // Parse query params or set safe defaults
      const fromDate = from ? new Date(from) : new Date('1970-01-01');
      const toDate = to ? new Date(to) : new Date('2099-12-31');

      // Validate Dates
      if (isNaN(fromDate) || isNaN(toDate)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid query parameters.", 
            errors: ["'from' and 'to' must be valid dates (YYYY-MM-DD)."] 
        });
      }

      filteredBookings = bookings.filter(b => {
        if (!b.slotId) return false; // Handle deleted slots
        
        // Use the Slot's date field 
        const slotDate = new Date(b.slotId.date); 
        return slotDate >= fromDate && slotDate <= toDate;
      });
    }

    return res.status(200).json({
        success: true,
        data: filteredBookings
    });

  } catch (error) {
    console.error("List My Bookings Error:", error);
    return res.status(500).json({ 
        success: false, 
        message: "Internal Server Error", 
        errors: [error.message || "An unexpected error occurred"] 
    });
  }
};

// 3) POST /bookings/:id/cancel (Cancel booking)
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
      const { id } = req.params;
      const userId = req.user.userId; 

      // 1. Validation: Invalid ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
              success: false,
              message: "Invalid ID format.",
              errors: ["The provided bookingId is not a valid MongoDB ObjectId."]
          });
      }

      // 2. Find the Booking
      const booking = await Booking.findById(id).session(session);

      if (!booking) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({
              success: false,
              message: "Resource not found.",
              errors: ["Booking not found with the provided ID."]
          });
      }

      // 3. Authorization Check (Only the owner can cancel)
      if (booking.candidateId.toString() !== userId) {
          await session.abortTransaction();
          session.endSession();
          return res.status(403).json({
              success: false,
              message: "Access denied.",
              errors: ["You are not authorized to cancel this booking."]
          });
      }

      // 4. Check if already cancelled
      if (booking.status === 'CANCELLED') {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
              success: false,
              message: "Invalid action.",
              errors: ["This booking is already cancelled."]
          });
      }

      // 5. Update Booking Status
      booking.status = 'CANCELLED';
      await booking.save({ session });

      // 6. Decrement Slot Count
      // We use $inc: -1 to atomically reduce the count
      await Slot.findByIdAndUpdate(
          booking.slotId,
          { $inc: { bookedCount: -1 } },
          { session }
      );

      // 7. Commit Transaction
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
          success: true,
          message: "Booking cancelled successfully."
      });

  } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Cancel Booking Error:", error);

      return res.status(500).json({
          success: false,
          message: "Internal Server Error",
          errors: [error.message || "An unexpected error occurred"]
      });
  }
};