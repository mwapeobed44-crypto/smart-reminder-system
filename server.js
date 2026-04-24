const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const twilio = require("twilio");

const app = express();

/* =========================
   START CHECK
========================= */
console.log("🔥 SERVER STARTING...");

/* =========================
   DEBUG ENV CHECK (IMPORTANT)
========================= */
console.log("MONGO_URI =", process.env.MONGO_URI);

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =========================
   TWILIO SETUP
========================= */
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

/* =========================
   DATABASE (ATLAS FIX)
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch(err => console.log("❌ DB Error:", err.message));

const Reminder = require("./models/Reminder");

/* =========================
   SMS FUNCTION
========================= */
async function sendSMS(phone, message) {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_NUMBER,
      to: phone
    });

    console.log("📩 SMS SENT:", phone);

  } catch (err) {
    console.log("❌ SMS ERROR:", err.message);
  }
}

/* =========================
   TEST SMS ROUTE
========================= */
app.get("/test-sms", async (req, res) => {
  try {
    const testNumber = "+260769976652";

    await sendSMS(testNumber, "🔥 TEST SMS WORKING");

    res.send("✅ TEST SMS SENT SUCCESSFULLY");
  } catch (err) {
    console.log(err);
    res.status(500).send("❌ TEST FAILED");
  }
});

/* =========================
   CREATE REMINDER
========================= */
app.post("/api/reminders", async (req, res) => {
  try {
    console.log("📥 REQUEST:", req.body);

    let { title, type, date, phones } = req.body;

    if (!title || !type || !date) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!phones) {
      return res.status(400).json({ message: "Phone required" });
    }

    if (!Array.isArray(phones)) {
      phones = [phones];
    }

    phones = phones.map(p => String(p).trim()).filter(Boolean);

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const reminder = new Reminder({
      title,
      type,
      date: parsedDate,
      phones,
      isRecurring: type === "birthday"
    });

    const saved = await reminder.save();

    console.log("✅ SAVED:", saved);

    res.status(201).json(saved);

  } catch (err) {
    console.log("❌ CREATE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET ALL REMINDERS
========================= */
app.get("/api/reminders", async (req, res) => {
  try {
    const data = await Reminder.find().sort({ date: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   DELETE REMINDER
========================= */
app.delete("/api/reminders/:id", async (req, res) => {
  try {
    await Reminder.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   CRON JOB (TEST MODE)
========================= */
cron.schedule("* * * * *", async () => {
  try {
    console.log("⏰ CRON RUNNING...");

    const reminders = await Reminder.find();

    for (let r of reminders) {

      console.log("CHECKING:", r.title);

      if (!r.sentDayBefore) {

        for (let phone of r.phones) {
          await sendSMS(phone, `📅 TEST REMINDER: ${r.title}`);
        }

        r.sentDayBefore = true;
        await r.save();

        console.log("📩 SENT:", r.title);
      }
    }

  } catch (err) {
    console.log("❌ CRON ERROR:", err.message);
  }
});

/* =========================
   START SERVER
========================= */
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});