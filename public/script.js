const form = document.getElementById("reminderForm");
const list = document.getElementById("reminderList");

// 🌍 BASE URL
const BASE_URL = "https://smart-reminder-system-a0w0.onrender.com";
const API_URL = `${BASE_URL}/api/reminders`;

console.log("FRONTEND SCRIPT RUNNING ✅");

// 🔐 TOKEN
let token = localStorage.getItem("token");

/* =========================
   UI CONTROL
========================= */
function checkAuthUI() {
  const appSection = document.getElementById("appSection");

  if (token) {
    appSection.style.display = "block";
  } else {
    appSection.style.display = "none";
  }
}

/* =========================
   LOAD ON START
========================= */
window.onload = () => {
  checkAuthUI();

  if (token) {
    loadReminders();
  }
};

/* =========================
   POPUP
========================= */
function showPopup(message, color = "green") {
  const popup = document.createElement("div");
  popup.innerText = message;

  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.right = "20px";
  popup.style.background = color;
  popup.style.color = "white";
  popup.style.padding = "10px 20px";
  popup.style.borderRadius = "10px";
  popup.style.zIndex = "9999";

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

/* =========================
   🔐 REGISTER
========================= */
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    showPopup("✅ Registered! Now login.");

  } catch (err) {
    console.error(err);
    showPopup("❌ Registration failed", "red");
  }
}

/* =========================
   🔐 LOGIN
========================= */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    localStorage.setItem("token", data.token);
    token = data.token;

    showPopup("✅ Logged in!");
    checkAuthUI();
    loadReminders();

  } catch (err) {
    console.error(err);
    showPopup("❌ Login failed", "red");
  }
}

/* =========================
   🔓 LOGOUT
========================= */
function logout() {
  localStorage.removeItem("token");
  token = null;

  list.innerHTML = "";
  checkAuthUI();

  showPopup("👋 Logged out", "orange");
}

/* =========================
   ➕ ADD REMINDER
========================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!token) {
    return showPopup("⚠️ Please login first", "orange");
  }

  const phoneInput = document.getElementById("phone").value;

  const reminder = {
    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value,
    date: new Date(document.getElementById("date").value).toISOString(),
    phones: phoneInput
      .split(",")
      .map(p => p.trim())
      .filter(p => p !== "")
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(reminder)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    showPopup("✅ Reminder Added!");
    form.reset();
    loadReminders();

  } catch (err) {
    console.error(err);
    showPopup("❌ Failed to add reminder", "red");
  }
});

/* =========================
   📥 LOAD REMINDERS
========================= */
async function loadReminders() {
  try {
    const res = await fetch(API_URL, {
      headers: {
        "Authorization": token
      }
    });

    const data = await res.json();

    list.innerHTML = "";

    if (!data.length) {
      list.innerHTML = "<p style='color:white;text-align:center;'>No reminders yet</p>";
      return;
    }

    data.forEach(r => {
      const li = document.createElement("li");

      li.innerHTML = `
        <div>
          <strong>${r.title}</strong><br>
          <small>📅 ${new Date(r.date).toLocaleString()}</small><br>
          <small>📱 ${r.phones.join(", ")}</small>
        </div>
        <button class="delete-btn" onclick="deleteReminder('${r._id}')">❌</button>
      `;

      list.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    showPopup("❌ Load failed (login first)", "red");
  }
}

/* =========================
   ❌ DELETE REMINDER
========================= */
async function deleteReminder(id) {
  try {
    await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": token
      }
    });

    showPopup("🗑️ Deleted", "orange");
    loadReminders();

  } catch (err) {
    console.error(err);
    showPopup("❌ Delete failed", "red");
  }
}