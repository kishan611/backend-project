const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  slotId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Slot', 
    required: true 
  },
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['BOOKED', 'CANCELLED'], 
    default: 'BOOKED' 
  },
  bookedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });


BookingSchema.index({ slotId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('Booking', BookingSchema);