const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  role: { 
    type: String, 
    enum: ['ADMIN', 'CANDIDATE'], 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);