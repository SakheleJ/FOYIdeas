// -------------------- REGISTER USER --------------------
async function registerUserENC() {
  const name = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const password = document.getElementById("userPassword").value.trim();
  const role = document.getElementById("userRole").value;

  document.getElementById("register-error").textContent = "";

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
  const newId = db.users.length ? Math.max(...db.users.map(u => u.UserID)) + 1 : 1;

  db.users.push({ UserID: newId, name, email, password: hashedPassword, role });
  saveDatabase(db);

  alert("Registration successful!");

  const modal = bootstrap.Modal.getInstance(document.getElementById("registerUserModal"));
  modal.hide();
  document.getElementById("registerUserForm").reset();
}

// -------------------- LOGIN --------------------
async function loginENC() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const hashedPassword = await hashPassword(password);

  const db = getDatabase();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === hashedPassword
  );

  if (!user) {
    document.getElementById("register-error").textContent = "Invalid email or password.";
    return;
  }

  alert(`Welcome back, ${user.name}!`);
  localStorage.setItem("currentUser", JSON.stringify(user));
  window.location.href = "dashboard.html";
}
// -------------------- LOGOUT --------------------
// Logs the user out and returns them to index.html
function logout() {
    // Remove stored session
    localStorage.removeItem("currentUser");

    // Optional: clear timestamp or other session caches
    localStorage.removeItem("session_timestamp");

    // Optional: Clear entire LocalStorage EXCEPT the database
    // const db = localStorage.getItem("foyDB");
    // localStorage.clear();
    // if (db) localStorage.setItem("foyDB", db);

    // Redirect to login
    window.location.href = "index.html";
}
