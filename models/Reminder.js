const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  type: {
    type: String,
    enum: ["event", "birthday"],
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  // ✅ phones array (correct)
  phones: {
    type: [String],
    required: true
  },

  // 🔥 NEW: for yearly repeating (birthdays)
  isRecurring: {
    type: Boolean,
    default: false
  },

  // used by cron to avoid duplicate sending
  sentDayBefore: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Reminder", reminderSchema);