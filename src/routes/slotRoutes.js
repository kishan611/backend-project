const express = require("express");
const router = express.Router();
const slotController = require("../controllers/slotController");
const { authenticate, authorize } = require("../middleware/auth");

// prefix: /slots

// Public or Authenticated Read
router.get("/slots", authenticate, slotController.listSlots);
router.get("/:id", authenticate, slotController.getSlotById);

// Admin Only Write Access
router.post("/", authenticate, authorize("ADMIN"), slotController.createSlot);
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  slotController.updateSlot
);
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  slotController.deleteSlot
);

module.exports = router;
