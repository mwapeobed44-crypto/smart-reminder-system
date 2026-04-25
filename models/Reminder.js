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

  phones: {
    type: [String],
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  isRecurring: {
    type: Boolean,
    default: false
  },

  sentDayBefore: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Reminder", reminderSchema);