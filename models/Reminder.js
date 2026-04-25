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

  // ✅ phones array
  phones: {
    type: [String],
    required: true
  },

  // 🔐 NEW: link reminder to a user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // 🔥 recurring (for birthdays)
  isRecurring: {
    type: Boolean,
    default: false
  },

  // avoid duplicate sending
  sentDayBefore: {
    type: Boolean,
    default: false