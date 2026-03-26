// SCRIPT: presbytery.js
// Presbytery management functions (register, load, render dropdown/table)
// ==================== LOAD DATA ==========================
const db = JSON.parse(localStorage.getItem("foyDB") || "{}");
const presbyteries = db.Presbytery || [];
const congregations = db.Congregation || [];
const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

// ==================== HTML ELEMENTS ======================
const presbyteryCardContainer = document.getElementById("presbyteryList");
const presbyterySelect = document.getElementById("presbytery-select");


// Register a new presbytery (keeps old behavior & IDs)
function registerPresbytery() {
  const nameEl = document.getElementById("presbyteryName");
  const synodEl = document.getElementById("presbyterySynod");
  const errorEl = document.getElementById("presbytery-error");

  const name = nameEl ? nameEl.value.trim() : "";
  const synod = synodEl ? synodEl.value.trim() : "";

  if (errorEl) errorEl.textContent = "";

  if (!name) {
    if (errorEl) errorEl.textContent = "Name field is required.";
    else alert("Name field is required.");
    return;
  }

  // ensure db.Presbytery exists and links to presbyteries
  if (!db.Presbytery) db.Presbytery = presbyteries;

  // duplicate check (case-insensitive)
  if ((db.Presbytery || presbyteries).some(p => p.name.toLowerCase() === name.toLowerCase())) {
    if (errorEl) errorEl.textContent = "Presbytery already exists.";
    else alert("Presbytery already exists.");
    return;
  }

  // maintain numeric ID behaviour (always number)
  const currentIds = (db.Presbytery || []).map(p => Number(p.presbyteryID)).filter(v => !Number.isNaN(v));
  const newId = currentIds.length ? Math.max(...currentIds) + 1 : 1;

  const newPresbytery = {
    presbyteryID: Number(newId),
    name,
    synod
  };

  db.Presbytery.push(newPresbytery);
  saveDatabase(db);
  updateFileStatus && updateFileStatus();

  alert("Presbytery added successfully!");

  // close modal if exists (keeps old modal id)
  try {
    const modal = bootstrap.Modal.getInstance(document.getElementById("registerPresbyteryModal"));
    if (modal) modal.hide();
  } catch (e) {
    // ignore if bootstrap not present
  }

  if (nameEl) nameEl.value = "";
  if (synodEl) synodEl.value = "";

  // Add option to any dropdowns & trigger change
  renderPresbyterySelect(); // repopulate selects
  if (presbyterySelect) {
    presbyterySelect.value = newPresbytery.presbyteryID;
    presbyterySelect.dispatchEvent(new Event('change'));
    try {
      presbyterySelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { presbyterySelect.scrollIntoView(); }
    presbyterySelect.focus();
  }

  // If there is a dedicated management table, refresh it
  if (typeof renderPresbyteryTable === "function") renderPresbyteryTable();
}

// Load presbyteries into app (alias)
function loadPresbyteries() {
  // Auto-select active presbytery (tolerant to property casing)
  if (currentUser && currentUser.activePresbytery && presbyterySelect) {
    presbyterySelect.value = currentUser.activePresbytery.presbyteryID || currentUser.activePresbytery.PresbyteryID || "";
  }

  return renderPresbyterySelect();
}

// Populate all selects with presbyteries
function renderPresbyterySelect() {
  const selectEls = document.querySelectorAll("[data-presbytery-select], #presbytery-select");

  selectEls.forEach(selectEl => {
    if (!selectEl) return;
    const placeholder = selectEl.getAttribute("data-placeholder") || "-- Select Presbytery --";
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    presbyteries.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.presbyteryID;
      opt.textContent = p.name;
      selectEl.appendChild(opt);
    });
  });

  return presbyteries;
}

// Render a simple management table for the dedicated Presbytery page
function renderPresbyteryTable() {
  const tbody = document.querySelector("#presbytery-table tbody");

  if (!tbody) return;

  tbody.innerHTML = "";
  presbyteries.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.synod || ""}</td>
      <td>
        <button class="btn btn-sm btn-danger" data-presbytery-id="${p.presbyteryID}" onclick="deletePresbytery(${p.presbyteryID})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Basic delete (keeps it minimal; will ask before delete)
function deletePresbytery(id) {
  if (!confirm("Delete this presbytery? This will NOT delete congregations automatically.")) return;
  const numericId = Number(id);
  db.Presbytery = (db.Presbytery || []).filter(p => Number(p.presbyteryID) !== numericId);
  saveDatabase(db);
  renderPresbyterySelect();
  if (typeof renderPresbyteryTable === "function") renderPresbyteryTable();
}

// Attach startup listeners (safe: only on pages where elements exist)
document.addEventListener("DOMContentLoaded", () => {
  renderPresbyterySelect();
  if (document.querySelector("#presbytery-table")) {
    renderPresbyteryTable();
  }

  // Hook submit button on dedicated page (if present)
  const registerBtn = document.getElementById("btn-register-presbytery");
  if (registerBtn) registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    registerPresbytery();
  });
});

// presbytery-cards.js

document.addEventListener("DOMContentLoaded", loadPresbyteryCards);

function loadPresbyteryCards() {
  if (!presbyteryCardContainer) return;

  presbyteryCardContainer.innerHTML = ""; // Clear previous

  // determine currently active presbytery (from user state)
  const activePresbyteryID = currentUser?.activePresbytery?.presbyteryID ? Number(currentUser.activePresbytery.presbyteryID) : null;

  // use the module-level arrays (they reference db arrays)

  presbyteries.forEach(p => {
    const synodName = p.synod || " ";
    const presName = p.name || "Unnamed Presbytery";
    const congCount = congregations.filter(c => Number(c.presbyteryID) === Number(p.presbyteryID)).length;
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);

    // Create card container
    const card = document.createElement("div");
    card.className = "col-6 col-md-4 col-lg-4 mb-3 presbytery-col";

    card.innerHTML = `
      <div class="card shadow-sm p-0 presby-card" style="cursor:pointer;">
        <div class="d-flex">
          <div class="color-block" style="background:${randomColor}; width:10px;"></div>
          <div class="p-3 flex-grow-1">
            <p class="text-muted small mb-0">${synodName}</p>
            <h5 class="mb-1">${presName}</h5>
            <p class="small mb-2"><strong>Congregations:</strong> ${congCount}</p>
            <button class="btn btn-sm btn-outline-danger btn-delete"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>
    `;

    const cardElement = card.querySelector(".presby-card");
    if (Number(p.presbyteryID) === activePresbyteryID) {
      cardElement.classList.add("active");
    }

    // Card click handler - set active presbytery and navigate to congregations
    cardElement.addEventListener("click", (e) => {
      // Don't navigate if delete button was clicked
      if (e.target.closest(".btn-delete")) return;

      // visually highlight selected card
      presbyteryCardContainer.querySelectorAll(".presby-card.active").forEach(el => el.classList.remove("active"));
      cardElement.classList.add("active");

      const cu = JSON.parse(localStorage.getItem("currentUser")) || {};
      cu.activePresbytery = {
        presbyteryID: Number(p.presbyteryID),
        name: presName,
        synod: synodName
      };
      localStorage.setItem("currentUser", JSON.stringify(cu));
      window.location.href = "congregations.html";
    });

    // Delete button
    const deleteBtn = card.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click handler from firing
      if (confirm(`Are you sure you want to delete "${presName}"?`)) {
        // Remove presbytery
        db.Presbytery = db.Presbytery.filter(x => Number(x.presbyteryID) !== Number(p.presbyteryID));
        // Optionally remove all congregations in this presbytery
        db.Congregation = db.Congregation.filter(c => Number(c.presbyteryID) !== Number(p.presbyteryID));
        saveDatabase(db);
        loadPresbyteryCards(); // Refresh
      }
    });

    presbyteryCardContainer.appendChild(card);
  });
}



// Provide legacy alias names if other scripts call them
window.registerPresbytery = registerPresbytery;
window.loadPresbyteries = loadPresbyteries;
window.updatePresbyteryDropdown = renderPresbyterySelect;

// ==========================================================
// INITIAL LOAD
// ==========================================================
loadPresbyteryCards();

