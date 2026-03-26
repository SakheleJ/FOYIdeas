document.addEventListener("DOMContentLoaded", init);

// Create timestamp (YYMMDD_HHMM)
const now = new Date();
const year = String(now.getFullYear()).slice(-2);
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");
const hours = String(now.getHours()).padStart(2, "0");
const minutes = String(now.getMinutes()).padStart(2, "0");
const timestamp = `${year}${month}${day}_${hours}${minutes}`;

function init() {
  // Initialize default DB if not set
  if (!localStorage.getItem("foyDB")) {
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
    localStorage.setItem("foyDB", JSON.stringify(defaultDB));
  }

  const fileInput = document.getElementById("file-input");
  if (fileInput) fileInput.addEventListener("change", handleFileSelect);

  updateFileStatus();
}

// Run on every page except index.html
(function checkAuth() {
    const isLoginPage = window.location.pathname.endsWith("index.html") ||
                        window.location.pathname === "/";

    const user = localStorage.getItem("currentUser");

    if (!user && !isLoginPage) {
        window.location.href = "index.html";
    }
})();


function getSelectedCongregation() {
  const id = localStorage.getItem("selectedCongregation");
  if (!id) return null;

  const db = getDatabase();
  return db.Congregation.find(c => c.congregationID === id) || null;
}