const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const twilio = require("twilio");

// 🔐 NEW
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app = express();

/* =========================
   START CHECK
========================= */
console.log("🔥 SERVER STARTING...");
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
   DATABASE
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch(err => console.log("❌ DB Error:", err.message));

const Reminder = require("./models/Reminder");

/* =========================
   🔐 AUTH MIDDLEWARE
========================= */
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

/* =========================
   🔐 AUTH ROUTES
========================= */

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    res.json({ message: "User registered" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
    res.status(500).send("❌ TEST FAILED");
  }
});

/* =========================
   CREATE REMINDER (🔐 PROTECTED)
========================= */
app.post("/api/reminders", auth, async (req, res) => {
  try {
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
      isRecurring: type === "birthday",
      userId: req.userId   // 🔥 LINK TO USER
    });

    const saved = await reminder.save();

    res.status(201).json(saved);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET REMINDERS (🔐 USER ONLY)
========================= */
app.get("/api/reminders", auth, async (req, res) => {
  try {
    const data = await Reminder.find({ userId: req.userId }).sort({ date: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   DELETE REMINDER
========================= */
app.delete("/api/reminders/:id", auth, async (req, res) => {
  try {
    await Reminder.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   CRON JOB
========================= */
cron.schedule("* * * * *", async () => {
  try {
    console.log("⏰ CRON RUNNING...");

    const reminders = await Reminder.find();

    for (let r of reminders) {
      if (!r.sentDayBefore) {

        for (let phone of r.phones) {
          await sendSMS(phone, `📅 TEST REMINDER: ${r.title}`);
        }

        r.sentDayBefore = true;
        await r.save();
      }
    }

  } catch (err) {
    console.log("❌ CRON ERROR:", err.message);
  }
});

/* =========================
   START SERVER
========================= */
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running...");
});