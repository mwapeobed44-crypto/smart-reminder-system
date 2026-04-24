const form = document.getElementById("reminderForm");
const list = document.getElementById("reminderList");

// 🌍 LIVE API URL
const API_URL = "https://smart-reminder-system-a0w0.onrender.com/api/reminders";

console.log("FRONTEND SCRIPT RUNNING ✅");

window.onload = loadReminders;

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
   ➕ ADD REMINDER
========================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

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

  console.log("SENDING:", reminder);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reminder)
    });

    const data = await res.json();
    console.log("RESPONSE:", data);

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
    const res = await fetch(API_URL);
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
    showPopup("❌ Load failed", "red");
  }
}

/* =========================
   ❌ DELETE REMINDER
========================= */
async function deleteReminder(id) {
  try {
    await fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    showPopup("🗑️ Deleted", "orange");
    loadReminders();

  } catch (err) {
    console.error(err);
    showPopup("❌ Delete failed", "red");
  }
}