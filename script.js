document.addEventListener("DOMContentLoaded", init);

// Create timestamp (YYMMDD_HHMM)
const now = new Date();
const year = String(now.getFullYear()).slice(-2);
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");
const hours = String(now.getHours()).padStart(2, "0");
const minutes = String(now.getMinutes()).padStart(2, "0");
const timestamp = `${year}${month}${day}_${hours}${minutes}`;

function generateGUID() {
  // Returns a standard 8-4-4-4-12 formatted UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function init() {
  // Initialize default DB if not set
  if (!localStorage.getItem("userDB")) {
    const defaultDB = {
      users: [
        {
          UserID: 1,
          name: "admin",
          email: "admin@foy.co.za",
          password: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
          role: "DBadmin"
        }
      ]
    };
    localStorage.setItem("userDB", JSON.stringify(defaultDB));
  }

  document.getElementById("file-input").addEventListener("change", handleFileSelect);
  updateFileStatus();
}

// Switch between forms
function showForm(formId) {
  // document.getElementById("registerForm").style.display = "block";
    const form = document.getElementById(formId);
  if (!form) {
    console.error(`Form with ID "${formId}" not found`);
    return;
  }
  document.getElementById(formId).style.display = "block";
  clearErrors();
}

function clearErrors() {
  //document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";
}

// -------------------- FILE UPLOAD --------------------
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.users || !Array.isArray(data.users)) throw new Error("Invalid JSON structure.");
      localStorage.setItem("userDB", JSON.stringify(data));
      alert("Database loaded successfully!");
      updateFileStatus();
    } catch (err) {
      alert("Invalid JSON file format. Make sure it has a 'users' array.");
    }
  };
  reader.readAsText(file);
}

function exportDatabase() {
  const db = JSON.parse(localStorage.getItem("userDB") || '{"users": []}');
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `db_${timestamp}.foydb`;
  a.click();
}
// -------------------- DATABASE HANDLING --------------------
function getDatabase() {
  // Parse the database from localStorage
  const db = JSON.parse(localStorage.getItem("userDB") || '{}');

  // Ensure all arrays exist
  if (!db.users) db.users = [];
  if (!db.Presbytery) db.Presbytery = [];
  if (!db.Congregation) db.Congregation = []; // note: use exact capitalization

  return db;
}


function saveDatabase(db) {
  localStorage.setItem("userDB", JSON.stringify(db));
  //updateFileStatus();
}

function updateFileStatus() {
  const db = getDatabase();
  document.getElementById("file-status").textContent = `Database active with ${db.users.length} users.`;
}

// -------------------- REGISTER USER--------------------
function registerUser() {
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const role = document.getElementById("register-role").value;
  document.getElementById("register-error").textContent = "";
  if (!name || !email || !password || !role) {
    document.getElementById("register-error").textContent = "All fields are required.";
    return;
  }

  const db = getDatabase();

  if (db.users.some(u => u.email === email)) {
    document.getElementById("register-error").textContent = "Email already registered.";
    return;
  }

  const newId = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  db.users.push({ id: newId, name, email, password, role });
  saveDatabase(db);

  alert("Registration successful!");
  document.getElementById("register-form").style.display = "none";
  //document.getElementById(formId).style.display = "none";

}

// ------------ REGISTER ENCRYPTED USER ------------
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function registerUserENC() {
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const role = document.getElementById("register-role").value;

  if (!name || !email || !password || !role) {
    document.getElementById("register-error").textContent = "All fields are required.";
    return;
  }

  const db = getDatabase();

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    document.getElementById("register-error").textContent = "Email already registered.";
    return;
  }

  const hashedPassword = await hashPassword(password);

  const newId = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  db.users.push({ id: newId, name, email, password: hashedPassword, role });
  saveDatabase(db);

  alert("Registration successful!");
  document.getElementById("register-form").style.display = "none";
}

async function loginENC() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const hashedPassword = await hashPassword(password);

  const db = getDatabase();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === hashedPassword
  );

    if (user) {
        alert(`Welcome back, ${user.name}!`);
    localStorage.setItem("currentUser", JSON.stringify(user)); // store logged-in user
    window.location.href = "dashboard.html"; // go to dashboard
  } else {
    document.getElementById("register-error").textContent = "Invalid email or password.";
  }

  // if (!user) {
  //   alert("Invalid email or password");
  //   return;
  // }

  // alert(`Welcome back, ${user.name}!`);
}


// -------------------- LOGIN --------------------
function login() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const db = getDatabase();

const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (user) {
    localStorage.setItem("currentUser", JSON.stringify(user)); // store logged-in user
    window.location.href = "dashboard.html"; // go to dashboard
  } else {
    document.getElementById("register-error").textContent = "Invalid email or password.";
  }
}
