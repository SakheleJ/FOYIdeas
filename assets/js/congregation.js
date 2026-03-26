// SCRIPT: congregation.js
// Congregation rendering + add/update functions used by dashboard & congregations page

// Recreates updateCongregationTable(presbyteryID) from old code
function updateCongregationTable(presbyteryID) {
  const tableBody = document.querySelector("#congregation-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const db = getDatabase();
  const currentCongregations = db.Congregation || [];

  const normalizedPresbyteryID = Number(presbyteryID);

  const filtered = currentCongregations
    .filter(c => Number(c.presbyteryID) === normalizedPresbyteryID)
    .slice()
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  filtered.forEach((c, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}</td><td>${c.name}</td>`;
    row.addEventListener("click", () => {
      tableBody.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
    });
    tableBody.appendChild(row);
  });
}

// Add a single congregation via inputs (keeps old behaviour)
function registerCongregationFromInputs() {
  const presbyteryValRaw = document.getElementById("presbytery-select")?.value;
  const presbyteryVal = Number(presbyteryValRaw);
  const nameEl = document.getElementById("congregation-name");
  const name = nameEl ? nameEl.value.trim() : "";

  if (!presbyteryValRaw || Number.isNaN(presbyteryVal)) {
    alert("Please select a Presbytery first.");
    return;
  }
  if (!name) {
    alert("Please enter a congregation name.");
    return;
  }

  const db = getDatabase();
  if (!db.Congregation) db.Congregation = [];

  const duplicate = db.Congregation.some(c =>
    Number(c.presbyteryID) === presbyteryVal &&
    c.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    alert(`Congregation "${name}" already exists in this presbytery.`);
    return;
  }

  const newId = generateGUID();
  db.Congregation.push({
    congregationID: newId,
    presbyteryID: presbyteryVal,
    name
  });

  saveDatabase(db);

  if (nameEl) nameEl.value = "";

  // Refresh table on current presbytery
  updateCongregationTable(presbyteryVal);
}

// Render grid/cards on congregations.html (old loadCongregations)
function loadCongregations() {
  const db = getDatabase();
  const congregations = db.Congregation || [];
  const presbyteries = db.Presbytery || [];

  const container = document.getElementById("congregationList");
  if (!container) return;

  container.innerHTML = "";

    // Get active presbytery from currentUser
  const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};
  const activePresbyteryID = currentUser.activePresbytery?.presbyteryID ? Number(currentUser.activePresbytery.presbyteryID) : null;
  const activePresbytery = presbyteries.find(p => Number(p.presbyteryID) === activePresbyteryID);

  // Filter congregations if active presbytery is set and valid
  let filteredCongregations = activePresbytery
    ? congregations.filter(c => Number(c.presbyteryID) === activePresbyteryID)
    : [...congregations];

  // Fallback: if active presbytery is set but has zero congregations, show all and optionally tell the user
  if (activePresbytery && filteredCongregations.length === 0 && congregations.length > 0) {
    const info = document.createElement("p");
    info.className = "text-muted";
    info.textContent = `No congregations are registered under "${activePresbytery.name}" yet; showing all congregations.`;
    container.appendChild(info);
    filteredCongregations = [...congregations];
  }

  if (filteredCongregations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-muted";
    empty.textContent = "No congregations found. Please register one.";
    container.appendChild(empty);
    return;
  }

  filteredCongregations.forEach(c => {
    const presName = (presbyteries.find(p => Number(p.presbyteryID) === Number(c.presbyteryID)) || {}).name || "Unknown Presbytery";
    const card = document.createElement("div");
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);

    card.className = "col-6 col-md-4 col-lg-3 mb-3 cong-col";
    card.innerHTML = `
      <div class="card cong-card shadow-sm p-0" style="cursor:pointer;">
          <div class="d-flex">
              <div class="color-block" style="background:${randomColor};width:8px;"></div>
              <div class="p-3 flex-grow-1">
                <p class="text-muted small mb-0">${presName}</p>
                  <h5 class="mb-1">${c.name}</h5>
              </div>
          </div>
      </div>
    `;

    card.addEventListener("click", () => {
      // store selected congregation so members page can filter
      localStorage.setItem("selectedCongregation", c.congregationID);
      // navigate to member listing page
      window.location.href = "members.html";
    });

    container.appendChild(card);
  });
}

// Attach listeners for dashboard/congregations pages
document.addEventListener("DOMContentLoaded", () => {
  // If presbytery-select exists, wire to update table
  const presSel = document.getElementById("presbytery-select");
  if (presSel) {
    presSel.addEventListener("change", () => {
      const val = Number(presSel.value);
      if (!Number.isNaN(val)) updateCongregationTable(val);
    });
  }

  // Populate presbytery select in congregation modal (if available)
  if (typeof loadPresbyteries === "function") {
    loadPresbyteries();
  } else if (typeof renderPresbyterySelect === "function") {
    renderPresbyterySelect();
  }

  const activePresbyteryID = JSON.parse(localStorage.getItem("currentUser") || "{}")?.activePresbytery?.presbyteryID;
  const congPresbySelect = document.getElementById("cong-presbytery-select");
  if (congPresbySelect && activePresbyteryID) {
    congPresbySelect.value = activePresbyteryID;
  }

  // If page has a congregation-list, load cards
  if (document.getElementById("congregationList")) {
    loadCongregations();
  }

  // If table exists and a presbytery is pre-selected, load table
  const tableBody = document.querySelector("#congregation-table tbody");
  if (tableBody) {
    const presId = document.getElementById("presbytery-select")?.value;
    if (presId) updateCongregationTable(presId);
  }

  // Hook register congregation button if present
  const regCongBtn = document.getElementById("btn-register-congregation");
  if (regCongBtn) regCongBtn.addEventListener("click", (e) => { e.preventDefault(); registerCongregationFromInputs(); });
});

// -------------------- ADD CONGREGATION --------------------
const addBtn = document.getElementById("add-congregation-btn");
const congregationTable = document.getElementById("congregation-table"); // ensure this exists

if (addBtn && congregationTable) {
  // Add a new editable row
  addBtn.addEventListener("click", () => {
    addNewRow();
  });

  // Handle Enter or Escape for all input rows
  congregationTable.addEventListener("keydown", (e) => {
    const input = e.target;
    if (input.tagName !== "INPUT") return;

    const row = input.closest("tr");

    if (e.key === "Enter") {
      const presbyteryID = parseInt(document.getElementById("presbytery-select").value);
      if (!presbyteryID) {
        alert("Please select a Presbytery first.");
        return;
      }

      const db = getDatabase();
      if (!db.Congregation) db.Congregation = [];

      const inputs = congregationTable.querySelectorAll("input");
      const addedIds = [];

      inputs.forEach(inputRow => {
        const name = inputRow.value.trim();
        if (!name) return;

        const duplicate = db.Congregation.some(
          c => c.presbyteryID === presbyteryID && c.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
          alert(`Congregation "${name}" already exists in this presbytery.`);
        } else {
          const newId = generateGUID();
          db.Congregation.push({ congregationID: newId, presbyteryID, name });
          addedIds.push(newId);
        }
      });

      saveDatabase(db);

      // Remove all input rows
      inputs.forEach(inputRow => inputRow.closest("tr").remove());

      // Update the table
      updateCongregationTable(presbyteryID);
    } else if (e.key === "Escape") {
      row.remove();
    }
  });
}

function addNewRow() {
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
}


function registerCongregationModal() {
  const presbyteryIdRaw = document.getElementById("cong-presbytery-select")?.value;
  const presbyteryId = Number(presbyteryIdRaw);
  const nameEl = document.getElementById("congregation-name");
  const name = nameEl ? nameEl.value.trim() : "";
  const errorEl = document.getElementById("congregation-error");

  if (errorEl) errorEl.textContent = "";

  if (!presbyteryIdRaw || Number.isNaN(presbyteryId)) {
    if (errorEl) errorEl.textContent = "Please select a presbytery.";
    return;
  }

  if (!name) {
    if (errorEl) errorEl.textContent = "Please enter a congregation name.";
    return;
  }

  const db = getDatabase();
  if (!db.Congregation) db.Congregation = [];

  const duplicate = db.Congregation.some(c =>
    Number(c.presbyteryID) === presbyteryId &&
    c.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    if (errorEl) errorEl.textContent = `Congregation \"${name}\" already exists in this presbytery.`;
    return;
  }

  const newId = generateGUID();
  db.Congregation.push({ congregationID: newId, presbyteryID: presbyteryId, name });
  saveDatabase(db);

  const cu = JSON.parse(localStorage.getItem("currentUser")) || {};
  cu.activePresbytery = db.Presbytery.find(p => Number(p.presbyteryID) === presbyteryId) || cu.activePresbytery;
  localStorage.setItem("currentUser", JSON.stringify(cu));

  if (nameEl) nameEl.value = "";
  if (errorEl) errorEl.textContent = "";

  const modalEl = document.getElementById("registerCongregationModal");
  try {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  } catch (e) {}

  loadCongregations();
  alert(`Congregation "${name}" added successfully.`);
}

// expose legacy names
window.updateCongregationTable = updateCongregationTable;
window.registerCongregation = registerCongregationFromInputs;
window.registerCongregationModal = registerCongregationModal;
window.loadCongregations = loadCongregations;
window.addCongregation = () => addBtn.click();
