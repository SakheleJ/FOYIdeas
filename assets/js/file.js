// -------------------- FILE UPLOAD --------------------
function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.users || !Array.isArray(data.users)) throw new Error("Invalid JSON structure.");
      localStorage.setItem("foyDB", JSON.stringify(data));
      alert("Database loaded successfully!");
      updateFileStatus();
    } catch (err) {
      alert("Invalid JSON file format. Make sure it has a 'users' array.");
    }
  };

  reader.readAsText(file);
}

function exportDatabase() {
  const db = JSON.parse(localStorage.getItem("foyDB") || '{"users": []}');
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `db_${timestamp}.foydb`;
  a.click();
}
