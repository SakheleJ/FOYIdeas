/**
 * db-merge.js
 *
 * Contains ALL the logic for:
 * - Loading .foydb file
 * - Validating JSON
 * - Comparing with existing DB
 * - Generating preview counts
 * - Merging safely by GUID
 *
 * No functionality changed — only reorganized.
 */

let loadedFileData = null;

// ------------------------
// VALIDATION HELPERS
// ------------------------
function isValidFoyDB(json) {
  return (
    typeof json === "object" &&
    json.users &&
    Array.isArray(json.users)
  );
}

// ------------------------
// FILE LOADING + PREVIEW
// ------------------------
function handleFileLoad(input) {
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const json = JSON.parse(e.target.result);

      if (!isValidFoyDB(json)) {
        alert("Invalid FOY Database file. Expected structure missing: users[]");
        return;
      }

      loadedFileData = json;
      previewDB(json);

    } catch (err) {
      alert("Error reading JSON file: " + err.message);
    }
  };

  reader.readAsText(file);
}

// ------------------------
// PREVIEW DOM UPDATE
// ------------------------
function previewDB(data) {
  const countUsers = data.users.length || 0;
  const countPres = data.Presbytery ? data.Presbytery.length : 0;
  const countCong = data.Congregation ? data.Congregation.length : 0;

  const el = document.getElementById("file-preview-area");
  if (!el) return;

  el.innerHTML = `
    <div class="card mt-3 shadow-sm">
      <div class="card-header bg-primary text-white">
        <strong>File Loaded Successfully</strong>
      </div>
      <div class="card-body">
        <p><strong>Users:</strong> ${countUsers}</p>
        <p><strong>Presbyteries:</strong> ${countPres}</p>
        <p><strong>Congregations:</strong> ${countCong}</p>
        <button class="btn btn-success mt-2" onclick="mergeLoadedDB()">Merge Into Active Database</button>
      </div>
    </div>
  `;
}

// ------------------------
// MERGING LOGIC
// ------------------------
function mergeLoadedDB() {
  if (!loadedFileData) {
    alert("No file loaded.");
    return;
  }

  const current = getDatabase();
  const incoming = loadedFileData;

  const merged = mergeDBs(current, incoming);

  saveDatabase(merged);

  alert("Merge completed successfully!");
  updateFileStatus();

  loadedFileData = null;

  const el = document.getElementById("file-preview-area");
  if (el) el.innerHTML = "";
}


// ------------------------
// TRUE GUID-BASED MERGE
// ------------------------
function mergeDBs(current, incoming) {
  const merged = structuredClone(current);

  // ---- USERS ----
  if (incoming.users && Array.isArray(incoming.users)) {
    incoming.users.forEach(user => {
      if (!merged.users.some(u => u.UserID === user.UserID)) {
        merged.users.push(user);
      }
    });
  }

  // ---- PRESBYTERIES ----
  if (incoming.Presbytery && Array.isArray(incoming.Presbytery)) {
    incoming.Presbytery.forEach(p => {
      if (!merged.Presbytery.some(x => x.PresbyteryID === p.PresbyteryID)) {
        merged.Presbytery.push(p);
      }
    });
  }

  // ---- CONGREGATIONS ----
  if (incoming.Congregation && Array.isArray(incoming.Congregation)) {
    incoming.Congregation.forEach(c => {
      if (!merged.Congregation.some(x => x.CongregationID === c.CongregationID)) {
        merged.Congregation.push(c);
      }
    });
  }

  return merged;
}


// ------------------------
// PUBLIC API (if needed)
// ------------------------
window.handleFileLoad = handleFileLoad;
window.mergeLoadedDB = mergeLoadedDB;
