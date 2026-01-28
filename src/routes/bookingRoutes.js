const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { authenticate, authorize } = require("../middleware/auth");

// prefix: /bookings

// Candidate Only
router.post(
  "/",
  authenticate,
  authorize("CANDIDATE"),
  bookingController.createBooking
);
router.get(
  "/my",
  authenticate,
  authorize("CANDIDATE"),
  bookingController.listMyBookings
);
router.post(
  "/:id/cancel",
  authenticate,
  authorize("CANDIDATE"),
  bookingController.cancelBooking
);

module.exports = router;
