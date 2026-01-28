const mongoose = require("mongoose");

const SlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [String],
  },
  { timestamps: true }
);

// Validation: startTime must be before endTime
// Validation: startTime must be before endTime
SlotSchema.pre("validate", function () {
  if (this.startTime >= this.endTime) {
    throw new Error("End time must be greater than start time");
  }
});

module.exports = mongoose.model("Slot", SlotSchema);
