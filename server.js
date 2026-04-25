const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const twilio = require("twilio");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Reminder = require("./models/Reminder");

const app = express();

/* =========================
   START LOG
========================= */
console.log("🔥 SERVER STARTING...");
console.log("PORT:", process.env.PORT);

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =========================
   TWILIO
========================= */
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

/* =========================
   DB CONNECTION
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err.message));

/* =========================
   AUTH MIDDLEWARE (FIXED)
========================= */
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : header;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* =========================
   REGISTER
========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    res.json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   LOGIN
========================= */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
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

    console.log("📩 SENT:", phone);

  } catch (err) {
    console.log("❌ SMS ERROR:", err.message);
  }
}

/* =========================
   REMINDERS (PROTECTED)
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

    const reminder = new Reminder({
      title,
      type,
      date: new Date(date),
      phones,
      isRecurring: type === "birthday",
      userId: req.userId
    });

    const saved = await reminder.save();

    res.status(201).json(saved);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET REMINDERS
========================= */
app.get("/api/reminders", auth, async (req, res) => {
  try {
    const data = await Reminder.find({ userId: req.userId });
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
    const reminders = await Reminder.find();

    for (let r of reminders) {
      if (!r.sentDayBefore) {
        for (let phone of r.phones) {
          await sendSMS(phone, `📅 REMINDER: ${r.title}`);
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
   START SERVER (RENDER SAFE)
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});