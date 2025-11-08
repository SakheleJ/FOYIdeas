// Redirect to login if not logged in
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "index.html";
}

// Display welcome
document.getElementById("welcome").textContent = `Hi, ${currentUser.name} `;

// Load DB
const db = JSON.parse(localStorage.getItem("userDB") || '{"Presbytery": [], "Congregation": []}');
const presbyteries = db.Presbytery || [];
const congregations = db.Congregation || [];

// Elements
const presbyterySelect = document.getElementById("presbytery-select");
const congregationTable = document.getElementById("congregation-table").querySelector("tbody");
const selectedPresbyteryText = document.getElementById("selected-presbytery");

// Populate presbytery dropdown
presbyteries.forEach(p => {
  const option = document.createElement("option");
  option.value = p.PresbyteryID;
  option.textContent = p.name;
  presbyterySelect.appendChild(option);
});

// Handle presbytery selection
presbyterySelect.addEventListener("change", () => {
  const presbyteryId = parseInt(presbyterySelect.value);
  const selectedPresbytery = presbyteries.find(p => p.PresbyteryID === presbyteryId);

  selectedPresbyteryText.textContent = selectedPresbytery ? `You selected: ${selectedPresbytery.name}` : "";
  
  updateCongregationTable(presbyteryId);
});

// Populate congregation table based on selected presbytery
function updateCongregationTable(presbyteryId) {
  congregationTable.innerHTML = ""; // clear previous
  
  const filtered = congregations.filter(c => c.PresbyteryID === presbyteryId)
  .slice() // create a copy to sort
  .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())); // sort alphabetically
  const db = getDatabase();

 filtered.forEach((c, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}</td><td>${c.name}</td>`; // use index + 1

    // Highlight selected row on click
    row.addEventListener("click", () => {
      congregationTable.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
    });

    congregationTable.appendChild(row);
  });
}

// Logout
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// -------------------- REGISTER NEW PRESBYTERY --------------------
function registerPresbytery() {
  const name = document.getElementById("presbytery-name").value.trim();
  const synod = document.getElementById("presbytery-synod").value.trim();

  if (!name ) {
    document.getElementById("presbytery-error").textContent = "Name field is required.";
    return;
  }

  const db = getDatabase();

  if (db.Presbytery && db.Presbytery.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    document.getElementById("presbytery-error").textContent = "Presbytery already exists.";
    return;
  }

  const newPresbytery = {
    PresbyteryID: db.Presbytery?.length ? Math.max(...db.Presbytery.map(p => p.PresbyteryID)) + 1 : 1,
    name,
    synod,
  };

  if (!db.Presbytery) db.Presbytery = [];
  db.Presbytery.push(newPresbytery);
  saveDatabase(db);

  alert("Presbytery added successfully!");
  document.getElementById("register-presbytery-form").style.display = "none";
  document.getElementById("presbytery-name").value = "";
  document.getElementById("presbytery-synod").value = "";
}

function hideForm(formId) {
  document.getElementById(formId).style.display = "none";
}

function showFormAddPres(formId) {
  document.querySelectorAll(".form-box").forEach(form => (form.style.display = "none"));
  document.getElementById(formId).style.display = "block";
}


// -------------------- REGISTER NEW CONGREGATION --------------------
// const addBtn = document.getElementById("add-congregation-btn");

// addBtn.addEventListener("click", () => {
//   const row = document.createElement("tr");
//   const cellIndex = document.createElement("td");
//   const cellName = document.createElement("td");
//   const input = document.createElement("input");

//   input.type = "text";
//   input.placeholder = "Enter name";

//   cellName.appendChild(input);
//   row.appendChild(cellIndex); // index will be updated later
//   row.appendChild(cellName);

//   congregationTable.appendChild(row);

//   // Focus on input
//   input.focus();

//   // Listen for Enter key to save
//   input.addEventListener("keypress", async (e) => {
//     if (e.key === "Enter") {
//       const name = input.value.trim();
//       if (!name) return;

//       // Save to database

//       const presbyteryId = document.getElementById("presbytery-select").value;
//       const db = getDatabase();
//       const newId = db.Congregation.length ? Math.max(...db.Congregation.map(c => c.CongregationID)) + 1 : 1;
//       db.Congregation.push({ CongregationID: newId, name, PresbyteryID: parseInt(presbyteryId) });
//       saveDatabase(db);

//       // Re-render table
//       updateCongregationTable(parseInt(presbyteryId));
//     }
//   });
// });
const addBtn = document.getElementById("add-congregation-btn");

// Add a new editable row
addBtn.addEventListener("click", () => {
  const row = document.createElement("tr");
  const cellIndex = document.createElement("td");
  const cellName = document.createElement("td");
  const input = document.createElement("input");

  input.type = "text";
  input.placeholder = "Enter name";

  cellName.appendChild(input);
  row.appendChild(cellIndex);
  row.appendChild(cellName);
  congregationTable.appendChild(row);

  input.focus();
});

// Handle Enter key for all input rows
// Handle Enter and Escape key for all input rows
congregationTable.addEventListener("keydown", (e) => {
  const isInput = e.target.tagName === "INPUT";

  if (!isInput) return;

  const row = e.target.closest("tr");

  if (e.key === "Enter") {
    const presbyteryId = parseInt(document.getElementById("presbytery-select").value);
    if (!presbyteryId) {
      alert("Please select a Presbytery first.");
      return;
    }

    const db = getDatabase();
    if (!db.Congregation) db.Congregation = [];

    // Collect all new inputs
    const inputs = congregationTable.querySelectorAll("input");
    const addedIds = [];

    inputs.forEach(input => {
      const name = input.value.trim();
      if (name) {
        const newId = generateGUID();
        db.Congregation.push({ CongregationID: newId, PresbyteryID: presbyteryId, name });
        addedIds.push(newId);
      }
    });

    saveDatabase(db);

    // Clear all input rows
    inputs.forEach(input => input.closest("tr").remove());

    // Re-render table
    updateCongregationTable(presbyteryId, addedIds);

  } else if (e.key === "Escape") {
    // Remove this input row without saving
    row.remove();
  }
});
