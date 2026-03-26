function getDatabase() {
    const raw = localStorage.getItem("foyDB");

    // 1️⃣ If nothing stored yet — create new DB
    if (!raw) {
        const emptyDB = {
            users: [],
            Presbytery: [],
            Congregation: [],
            Member: [],
            Affiliation: []
        };
        localStorage.setItem("foyDB", JSON.stringify(emptyDB));
        return emptyDB;
    }

    // 2️⃣ If DB exists, try reading it
    try {
        const parsed = JSON.parse(raw);
        // make sure collections exist (migrating old data)
        if (!parsed.users) parsed.users = [];
        if (!parsed.Presbytery) parsed.Presbytery = [];
        if (!parsed.Congregation) parsed.Congregation = [];
        if (!parsed.Member) parsed.Member = [];
        if (!parsed.Affiliation) parsed.Affiliation = [];

        // Normalize presbyteryID to numbers (migration for existing data)
        parsed.Presbytery = parsed.Presbytery.map(p => ({
            ...p,
            presbyteryID: Number(p.presbyteryID)
        }));
        parsed.Congregation = parsed.Congregation.map(c => ({
            ...c,
            presbyteryID: Number(c.presbyteryID)
        }));

        // Migrate Affiliation table to include member details
        parsed.Affiliation = parsed.Affiliation.map(a => {
            if (!a.title && !a.surname && !a.name && !a.dob && !a.gender) {
                // Find the member details
                const member = parsed.Member.find(m => m.memberID === a.memberID);
                if (member) {
                    return {
                        ...a,
                        title: member.title || '',
                        surname: member.surname || '',
                        name: member.name || '',
                        dob: member.dob || '',
                        gender: member.gender || ''
                    };
                }
            }
            return a;
        });

        return parsed;

    } catch (e) {
        console.error("❌ FOYDB is corrupted and cannot be loaded.", e);

        alert(
            "⚠️ Your FOY Database is corrupted and cannot be loaded.\n\n" +
            "Please restore from a backup file, or upload a new FOYDB JSON."
        );

        // Return a *read-only* safe fallback so app doesn't crash
        return {
            users: [],
            Presbytery: [],
            Congregation: [],
            Member: [],
            Affiliation: []
        };
    }
}


function saveDatabase(db) {
  localStorage.setItem("foyDB", JSON.stringify(db));
}

function updateFileStatus() {
  const db = getDatabase();
  const el = document.getElementById("file-status");
  if (el) el.textContent = `Database active with ${db.users.length} users.`;
}
