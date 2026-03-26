// SCRIPT: members.js
// Responsible for rendering a list of congregation members and managing registrations

// compute age in years based on YYYY-MM-DD string
function computeAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function updateCongregationDropdown(congSelect, allCong, presID, selectedCongID) {
  if (!congSelect) return;
  const filtered = presID ? allCong.filter(c => String(c.presbyteryID) === String(presID)) : allCong;
  congSelect.innerHTML = '<option value="">-- Select Congregation --</option>' + filtered.map(c => `<option value="${c.congregationID}" ${String(c.congregationID) === String(selectedCongID) ? 'selected' : ''}>${c.name}</option>`).join('');
}

function initializeCongregationFilter(congregations) {
  const filterCong = document.getElementById('filterCongregation');
  if (!filterCong) return;

  // Check if already populated
  if (filterCong.options.length > 0) return;

  congregations.forEach(c => {
    const option = document.createElement('option');
    option.value = String(c.congregationID);
    option.textContent = c.name;
    filterCong.appendChild(option);
  });

  // Set active congregation as selected by default
  const activeConId = localStorage.getItem('selectedCongregation');
  if (activeConId) {
    filterCong.value = activeConId;
  }
}

function loadMembers() {
  const db = getDatabase();
  const members = db.Member || [];
  const affiliations = db.Affiliation || [];
  const container = document.getElementById("memberList");
  if (!container) return;
  container.innerHTML = "";

  // determine filter (selected congregation stored in localStorage)
  const selectedCong = localStorage.getItem("selectedCongregation");

  // update header/back link if we have a congregation context
  if (selectedCong) {
    const selectedCongID = Number(selectedCong);
    const cong = (db.Congregation || []).find(c => Number(c.congregationID) === selectedCongID);
    if (cong) {
      const heading = document.querySelector(".main h3");
      if (heading) heading.textContent = `Members of ${cong.name}`;
      const backEl = document.getElementById("congBack");
      if (backEl) {
        backEl.innerHTML = `<a href="congregations.html">&larr; Back to congregations</a>`;
      }
    }
  }

  // filter unique members that have at least one affiliation in our filter
  let filtered = members;
  if (selectedCong) {
    const selectedCongID = Number(selectedCong);
    filtered = members.filter(m =>
      affiliations.some(a => a.memberID === m.memberID && Number(a.congregationID) === selectedCongID)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-muted p-3">No members found.</div>';
  } else {
    filtered.forEach(m => {
      const age = computeAge(m.dob);
      const selectedCongID = Number(selectedCong);
      const memberAff = affiliations.filter(a => a.memberID === m.memberID &&
        (!selectedCong || Number(a.congregationID) === selectedCongID));
      const lastYear = memberAff.length ? Math.max(...memberAff.map(a => a.yearRegistered)) : '';

      const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
      const item = document.createElement("div");
      item.className = "list-group-item d-flex align-items-center";
      item.innerHTML = `
      <div class="me-3 d-flex align-items-center justify-content-center" style="width:50px;height:50px;background:${randomColor};border-radius:50%;">
        <img src="https://via.placeholder.com/30?text=👤" alt="avatar" class="rounded-circle" />
      </div>
      <div class="flex-grow-1">
        <div class="row">
          <div class="col"><strong>Name:</strong> ${m.name || ''}</div>
          <div class="col"><strong>Surname:</strong> ${m.surname || ''}</div>
          <div class="col"><strong>Gender:</strong> ${m.gender || ''}</div>
          <div class="col"><strong>Title:</strong> ${m.title || ''}</div>
          <div class="col"><strong>Age:</strong> ${age}</div>
          <div class="col"><strong>Last Period:</strong> ${lastYear}</div>
        </div>
      </div>
    `;
      container.appendChild(item);
    });
  }

  renderAffiliations();
}

function renderAffiliations() {
  const db = getDatabase();
  const affiliations = db.Affiliation || [];
  const members = db.Member || [];
  const congregations = db.Congregation || [];
  const presbyteries = db.Presbytery || [];

  const cardsContainer = document.getElementById("affiliationCards");
  const detailsPanel = document.getElementById("memberDetailPanel");
  if (!cardsContainer || !detailsPanel) return;

  // Initialize congregation filter
  initializeCongregationFilter(congregations);

  // Get filter values
  const selectedCongs = Array.from(document.getElementById('filterCongregation')?.selectedOptions || []).map(o => o.value);
  const filterPeriod = document.getElementById('filterPeriod')?.value || '';
  const filterName = (document.getElementById('filterName')?.value || '').toLowerCase();
  const filterSurname = (document.getElementById('filterSurname')?.value || '').toLowerCase();
  const filterDOB = document.getElementById('filterDOB')?.value || '';

  // If no congregations selected, use active congregation or show all
  let congsToFilter = selectedCongs;
  if (congsToFilter.length === 0) {
    const selectedCong = localStorage.getItem("selectedCongregation");
    congsToFilter = selectedCong ? [selectedCong] : congregations.map(c => String(c.congregationID));
  }

  // Apply all filters
  let filteredAff = affiliations.filter(a => {
    // Filter by congregations
    if (!congsToFilter.includes(String(a.congregationID))) return false;

    // Filter by period
    if (filterPeriod && a.yearRegistered !== parseInt(filterPeriod, 10)) return false;

    // Filter by name, surname, dob using affiliation data
    if (filterName && !(a.name || '').toLowerCase().includes(filterName)) return false;
    if (filterSurname && !(a.surname || '').toLowerCase().includes(filterSurname)) return false;
    if (filterDOB && (a.dob || '').indexOf(filterDOB) !== 0) return false;

    return true;
  });

  cardsContainer.innerHTML = "";
  detailsPanel.innerHTML = `<div class="p-1 border rounded text-muted">Click a member card to see details.</div>`;

  if (filteredAff.length === 0) {
    cardsContainer.innerHTML = '<p class="text-muted">No affiliation records found.</p>';
    return;
  }

  const byMember = {};
  filteredAff.forEach(a => {
    const m = members.find(m => m.memberID === a.memberID);
    if (!m) return;
    const existing = byMember[m.memberID];
    if (!existing || a.yearRegistered > existing.affiliation.yearRegistered) {
      byMember[m.memberID] = { member: m, affiliation: a };
    }
  });

  const entries = Object.values(byMember).sort((a, b) => {
    const sa = `${a.affiliation.surname || ''}`.toLowerCase();
    const sb = `${b.affiliation.surname || ''}`.toLowerCase();
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return `${a.affiliation.name || ''}`.localeCompare(`${b.affiliation.name || ''}`);
  });

  entries.forEach(entry => {
    const m = entry.member;
    const a = entry.affiliation;
    const cong = congregations.find(c => String(c.congregationID) === String(a.congregationID)) || {};
    const pres = presbyteries.find(p => String(p.presbyteryID) === String(cong.presbyteryID)) || {};

    const card = document.createElement('div');
    card.className = 'card affiliation-card shadow-sm p-0 mb-1';
    card.style.cursor = 'pointer';
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    const yearShort = a.yearRegistered.toString().slice(-2);
    card.innerHTML = `
      <div class="d-flex">
          <div class="color-block" style="background:${randomColor};width:8px;"></div>
          <div class="p-1 flex-grow-1">
          <h6 class="mb-1">${a.title ? a.title + ' ' : ''}${a.surname || ''} ${a.name || ''}</h6>
          <p class="text-muted small mb-0">${cong.name || 'Unknown'} (${yearShort})</p>
          </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectMember(m, a, cong, pres);
      cardsContainer.querySelectorAll('.affiliation-card').forEach(el => el.classList.remove('border-primary'));
      card.classList.add('border', 'border-primary');
    });

    cardsContainer.appendChild(card);
  });

  // select first by default
  if (entries.length > 0) {
    const first = entries[0];
    const firstCard = cardsContainer.firstElementChild;
    if (firstCard) firstCard.classList.add('border', 'border-primary');
    selectMember(first.member, first.affiliation, congregations.find(c => String(c.congregationID) === String(first.affiliation.congregationID)) || {}, presbyteries.find(p => String(p.presbyteryID) === String(congregations.find(c => String(c.congregationID) === String(first.affiliation.congregationID))?.presbyteryID)) || {});
  }
}

function highlightDifferences(selectedAffiliation) {
  const currentMember = getDatabase().Member.find(m => m.memberID === selectedAffiliation.memberID);
  if (!currentMember) return;

  // Fields to check: title, surname, name, dob, gender, period, congregation
  const fields = [
    { id: 'detailTitle', current: currentMember.title || '', stored: selectedAffiliation.title || '' },
    { id: 'detailSurname', current: currentMember.surname || '', stored: selectedAffiliation.surname || '' },
    { id: 'detailName', current: currentMember.name || '', stored: selectedAffiliation.name || '' },
    { id: 'detailDOB', current: currentMember.dob || '', stored: selectedAffiliation.dob || '' },
    { id: 'detailGender', current: currentMember.gender || '', stored: selectedAffiliation.gender || '' },
    { id: 'detailPeriod', current: selectedAffiliation.yearRegistered.toString(), stored: selectedAffiliation.yearRegistered.toString() },
    { id: 'detailCongregation', current: selectedAffiliation.congregationID, stored: selectedAffiliation.congregationID },
    { id: 'detailPresbytery', current: getDatabase().Congregation.find(c => String(c.congregationID) === String(selectedAffiliation.congregationID))?.presbyteryID || '', stored: getDatabase().Congregation.find(c => String(c.congregationID) === String(selectedAffiliation.congregationID))?.presbyteryID || '' }
  ];

  // Remove previous highlights
  fields.forEach(field => {
    const element = document.getElementById(field.id);
    if (element) {
      element.classList.remove('bg-warning', 'bg-warning-subtle');
    }
  });

  // Add highlights for differences
  fields.forEach(field => {
    const element = document.getElementById(field.id);
    if (element && field.current !== field.stored) {
      element.classList.add('bg-warning-subtle');
    }
  });
}

function renderMemberAffiliations(member) {
  const db = getDatabase();
  const affiliations = db.Affiliation || [];
  const congregations = db.Congregation || [];
  const presbyteries = db.Presbytery || [];

  const listContainer = document.getElementById('memberAffiliationInstances');
  if (!listContainer) return;

  const memberAffs = affiliations.filter(a => a.memberID === member.memberID).sort((a,b)=>b.yearRegistered-a.yearRegistered);
  if (!memberAffs.length) {
    listContainer.innerHTML = '<div class="card p-2"><small class="text-muted">No affiliations for this member.</small></div>';
    return;
  }

  listContainer.innerHTML = '<h6 class="mb-2">Affiliation Instances</h6>' + memberAffs.map(a => {
    const cong = congregations.find(c => String(c.congregationID) === String(a.congregationID)) || {};
    const pres = presbyteries.find(p => String(p.presbyteryID) === String(cong.presbyteryID)) || {};
    const yearShort = a.yearRegistered.toString().slice(-2);
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    return `
      <div class="card affiliation-card shadow-sm p-0 mb-1" style="cursor: pointer;" data-affiliation-id="${a.affiliationID}">
        <div class="d-flex">
            <div class="color-block" style="background:${randomColor};width:8px;"></div>
            <div class="p-1 flex-grow-1">
            <h6 class="mb-1">${a.title ? a.title + ' ' : ''}${a.surname || ''} ${a.name || ''}</h6>
            <p class="text-muted small mb-0">${cong.name || 'Unknown'} (${yearShort})</p>
            </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for affiliation instances
  memberAffs.forEach(a => {
    const card = listContainer.querySelector(`[data-affiliation-id="${a.affiliationID}"]`);
    if (card) {
      card.addEventListener('click', () => {
        // Remove previous highlights
        listContainer.querySelectorAll('.affiliation-card').forEach(el => el.classList.remove('border-primary'));
        card.classList.add('border', 'border-primary');

        // Highlight differences in the edit form
        highlightDifferences(a);
      });
    }
  });
}

function selectMember(member, affiliation, congregation, presbytery) {
  const detailsPanel = document.getElementById('memberDetailPanel');
  if (!detailsPanel) return;

  const db = getDatabase();
  const allPresbyteries = db.Presbytery || [];
  const allCongregations = db.Congregation || [];

  detailsPanel.innerHTML = `
    <div class="card p-3 mb-3">
      <h5 class="card-title">Edit Member Details</h5>
      <form id="memberDetailForm" class="row g-2">
        <div class="col-6">
          <label class="form-label small">Presbytery</label>
          <select id="detailPresbytery" class="form-select form-select-sm"></select>
        </div>
        <div class="col-6">
          <label class="form-label small">Congregation</label>
          <select id="detailCongregation" class="form-select form-select-sm"></select>
        </div>

        <div class="col-4">
          <label class="form-label small">Title</label>
          <input id="detailTitle" class="form-control form-control-sm" value="${member.title || ''}" />
        </div>
        <div class="col-4">
          <label class="form-label small">Surname</label>
          <input id="detailSurname" class="form-control form-control-sm" value="${member.surname || ''}" />
        </div>
        <div class="col-4">
          <label class="form-label small">Name</label>
          <input id="detailName" class="form-control form-control-sm" value="${member.name || ''}" />
        </div>

        <div class="col-6">
          <label class="form-label small">DOB</label>
          <input id="detailDOB" type="date" class="form-control form-control-sm" value="${member.dob || ''}" />
        </div>
        <div class="col-3">
          <label class="form-label small">Gender</label>
          <select id="detailGender" class="form-select form-select-sm">
            <option value="">Select</option>
            <option value="Male" ${member.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${member.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${member.gender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="col-3">
          <label class="form-label small">Period</label>
          <input id="detailPeriod" type="number" class="form-control form-control-sm" value="${affiliation.yearRegistered || ''}" />
        </div>

        <div class="col-12 d-flex gap-2">
          <button type="button" id="saveMemberDetail" class="btn btn-primary btn-sm">Save Changes</button>
          <button type="button" id="addAffiliationBtn" class="btn btn-success btn-sm">Add Period</button>
        </div>
      </form>
    </div>

    <div id="memberAffiliationInstances"></div>
  `;

  const presSelect = document.getElementById('detailPresbytery');
  const congSelect = document.getElementById('detailCongregation');

  if (presSelect) {
    presSelect.innerHTML = '<option value="">-- Select Presbytery --</option>' + allPresbyteries.map(p => `<option value="${p.presbyteryID}" ${p.presbyteryID === presbytery.presbyteryID ? 'selected' : ''}>${p.name}</option>`).join('');
  }

  const selectedPresID = presbytery.presbyteryID;
  updateCongregationDropdown(congSelect, allCongregations, selectedPresID, congregation.congregationID);

  if (presSelect) {
    presSelect.addEventListener('change', () => {
      const selected = presSelect.value;
      updateCongregationDropdown(congSelect, allCongregations, selected, null);
    });
  }

  document.getElementById('saveMemberDetail')?.addEventListener('click', () => {
    const updatedTitle = document.getElementById('detailTitle').value.trim();
    const updatedSurname = document.getElementById('detailSurname').value.trim();
    const updatedName = document.getElementById('detailName').value.trim();
    const updatedDob = document.getElementById('detailDOB').value;
    const updatedGender = document.getElementById('detailGender').value;
    const updatedPeriod = parseInt(document.getElementById('detailPeriod').value, 10);
    const updatedCong = document.getElementById('detailCongregation').value;

    if (!updatedSurname || !updatedName || !updatedDob || !updatedGender || Number.isNaN(updatedPeriod) || !updatedCong) {
      alert('Please fill out all member and period/congregation fields.');
      return;
    }

    const dbToSave = getDatabase();
    const mIndex = (dbToSave.Member || []).findIndex(x => x.memberID === member.memberID);
    if (mIndex > -1) {
      dbToSave.Member[mIndex] = { ...dbToSave.Member[mIndex], title: updatedTitle, surname: updatedSurname, name: updatedName, dob: updatedDob, gender: updatedGender };
    }

    const affIndex = (dbToSave.Affiliation || []).findIndex(x => x.affiliationID === affiliation.affiliationID);
    if (affIndex > -1) {
      dbToSave.Affiliation[affIndex] = { 
        ...dbToSave.Affiliation[affIndex], 
        congregationID: updatedCong, 
        yearRegistered: updatedPeriod,
        title: updatedTitle,
        surname: updatedSurname,
        name: updatedName,
        dob: updatedDob,
        gender: updatedGender
      };
    }

    saveDatabase(dbToSave);
    loadMembers();
    selectMember(dbToSave.Member[mIndex], dbToSave.Affiliation[affIndex], allCongregations.find(c => String(c.congregationID) === String(updatedCong)) || {}, allPresbyteries.find(p => String(p.presbyteryID) === String((allCongregations.find(c => String(c.congregationID) === String(updatedCong)) || {}).presbyteryID)) || {});
  });

  document.getElementById('addAffiliationBtn')?.addEventListener('click', () => {
    const selectedCong = document.getElementById('detailCongregation').value;
    const selectedPeriod = parseInt(document.getElementById('detailPeriod').value, 10);

    // Get form values
    const formTitle = document.getElementById('detailTitle').value.trim();
    const formSurname = document.getElementById('detailSurname').value.trim();
    const formName = document.getElementById('detailName').value.trim();
    const formDob = document.getElementById('detailDOB').value;
    const formGender = document.getElementById('detailGender').value;

    if (!selectedCong || Number.isNaN(selectedPeriod) || !formSurname || !formName || !formDob || !formGender) {
      alert('Please fill out all required fields.');
      return;
    }

    const dbToSave = getDatabase();
    if (!dbToSave.Affiliation) dbToSave.Affiliation = [];

    // Check if this affiliation already exists
    const existingAff = dbToSave.Affiliation.find(a => 
      a.memberID === member.memberID && 
      String(a.congregationID) === String(selectedCong) && 
      a.yearRegistered === selectedPeriod
    );

    if (existingAff) {
      alert(`This member already has an affiliation for period ${selectedPeriod} in this congregation.`);
      return;
    }

    // Check if this is the newest period for this member
    const memberAffiliations = dbToSave.Affiliation.filter(a => a.memberID === member.memberID);
    const maxExistingPeriod = memberAffiliations.length > 0 ? Math.max(...memberAffiliations.map(a => a.yearRegistered)) : 0;
    const isNewestPeriod = selectedPeriod > maxExistingPeriod;

    // If this is the newest period, update the Member table
    if (isNewestPeriod) {
      const mIndex = dbToSave.Member.findIndex(x => x.memberID === member.memberID);
      if (mIndex > -1) {
        dbToSave.Member[mIndex] = { 
          ...dbToSave.Member[mIndex], 
          title: formTitle, 
          surname: formSurname, 
          name: formName, 
          dob: formDob, 
          gender: formGender 
        };
      }
    }

    const newAffiliation = {
      affiliationID: generateGUID(),
      memberID: member.memberID,
      congregationID: selectedCong,
      yearRegistered: selectedPeriod,
      title: formTitle,
      surname: formSurname,
      name: formName,
      dob: formDob,
      gender: formGender
    };

    dbToSave.Affiliation.push(newAffiliation);
    saveDatabase(dbToSave);

    loadMembers();
    const updatedCong = allCongregations.find(c => String(c.congregationID) === String(selectedCong)) || {};
    const updatedPres = allPresbyteries.find(p => String(p.presbyteryID) === String(updatedCong.presbyteryID)) || {};
    selectMember(dbToSave.Member.find(m => m.memberID === member.memberID), newAffiliation, updatedCong, updatedPres);
  });

  renderMemberAffiliations(member);
}

function registerMemberFromForm(e) {
  e.preventDefault();
  const title = document.getElementById("memberTitle").value.trim();
  const surname = document.getElementById("memberSurname").value.trim();
  const name = document.getElementById("memberName").value.trim();
  const dob = document.getElementById("memberDOB").value;
  const gender = document.getElementById("memberGender").value;
  const year = parseInt(document.getElementById("memberYear").value, 10);
  const cong = localStorage.getItem("selectedCongregation") || null;

  if (!cong) {
    alert("Please select a congregation before registering a member.");
    return;
  }

  if (!surname || !name || !dob || !gender || !year) {
    alert("Please complete all fields.");
    return;
  }

  const db = getDatabase();
  if (!db.Member) db.Member = [];
  if (!db.Affiliation) db.Affiliation = [];

  // try to find existing member (same name, surname, dob, gender)
  let member = db.Member.find(m =>
    m.surname.toLowerCase() === surname.toLowerCase() &&
    m.name.toLowerCase() === name.toLowerCase() &&
    m.dob === dob &&
    m.gender === gender
  );

  if (!member) {
    member = { memberID: generateGUID(), title, surname, name, dob, gender };
    db.Member.push(member);
  }

  const affiliation = {
    affiliationID: generateGUID(),
    memberID: member.memberID,
    congregationID: cong,
    yearRegistered: year,
    title: member.title || '',
    surname: member.surname || '',
    name: member.name || '',
    dob: member.dob || '',
    gender: member.gender || ''
  };
  db.Affiliation.push(affiliation);

  saveDatabase(db);
  // clear form
  document.getElementById("memberForm").reset();
  loadMembers();
}

// parse bulk CSV/line input into member objects
function parseBulkMembers(text) {
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    // split on comma, but simple (no quoted CSV support)
    const parts = line.split(',').map(p => p.trim());
    // Expect at least title,surname,name,dob,gender,period
    if (parts.length < 6) continue;
    const [title, surname, name, dob, gender, periodStr] = parts;
    const year = parseInt(periodStr, 10) || new Date().getFullYear();
    rows.push({ title: title || '', surname, name, dob, gender, year });
  }
  return rows;
}

function registerBulkMembersFromTextarea() {
  const text = document.getElementById('bulkMemberTextarea').value || '';
  const cong = localStorage.getItem('selectedCongregation') || null;
  if (!cong) {
    alert('Please select a congregation before importing members.');
    return;
  }
  const parsed = parseBulkMembers(text);
  if (parsed.length === 0) {
    alert('No valid member rows found. Use CSV per line: Title,Surname,Name,DOB,Gender,Period(optional)');
    return;
  }

  const db = getDatabase();
  if (!db.Member) db.Member = [];
  if (!db.Affiliation) db.Affiliation = [];

  let added = 0;
  for (const r of parsed) {
    if (!r.surname || !r.name || !r.dob || !r.gender) continue;

    // try to find existing member
    let member = db.Member.find(m =>
      m.surname.toLowerCase() === r.surname.toLowerCase() &&
      m.name.toLowerCase() === r.name.toLowerCase() &&
      m.dob === r.dob &&
      m.gender === r.gender
    );

    if (!member) {
      member = { memberID: generateGUID(), title: r.title || '', surname: r.surname, name: r.name, dob: r.dob, gender: r.gender };
      db.Member.push(member);
      added++;
    }

    // create affiliation for selected congregation (avoid duplicates for same period)
    const existsAff = db.Affiliation.some(a => a.memberID === member.memberID && String(a.congregationID) === String(cong) && a.yearRegistered === r.year);
    if (!existsAff) {
      db.Affiliation.push({ 
        affiliationID: generateGUID(), 
        memberID: member.memberID, 
        congregationID: cong, 
        yearRegistered: r.year,
        title: member.title || '',
        surname: member.surname || '',
        name: member.name || '',
        dob: member.dob || '',
        gender: member.gender || ''
      });
    }
  }

  saveDatabase(db);
  document.getElementById('bulkMemberTextarea').value = '';
  loadMembers();
  alert(`Imported ${parsed.length} rows (${added} new members).`);
}

// wire up upon DOM ready

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("memberList")) {
    const db = getDatabase();
    // sample seeding if no affiliations exist but we have a selected cong
    if ((!db.Affiliation || db.Affiliation.length === 0) && localStorage.getItem("selectedCongregation")) {
      // create sample member and affiliation
      const sampleMember = {
        memberID: generateGUID(),
        surname: "Doe",
        name: "John",
        gender: "Male",
        title: "Brother",
        dob: "1990-01-01"
      };
      if (!db.Member) db.Member = [];
      db.Member.push(sampleMember);
      if (!db.Affiliation) db.Affiliation = [];
      db.Affiliation.push({
        affiliationID: generateGUID(),
        memberID: sampleMember.memberID,
        congregationID: localStorage.getItem("selectedCongregation"),
        yearRegistered: new Date().getFullYear(),
        title: sampleMember.title || '',
        surname: sampleMember.surname || '',
        name: sampleMember.name || '',
        dob: sampleMember.dob || '',
        gender: sampleMember.gender || ''
      });
      saveDatabase(db);
    }

    loadMembers();
    const form = document.getElementById("memberForm");
    if (form) form.addEventListener("submit", registerMemberFromForm);

    const toggleBulkBtn = document.getElementById('toggleBulkImport');
    const bulkSection = document.getElementById('bulkSection');
    if (toggleBulkBtn && bulkSection) {
      toggleBulkBtn.addEventListener('click', function () {
        bulkSection.classList.toggle('d-none');
        toggleBulkBtn.textContent = bulkSection.classList.contains('d-none') ? 'Show Bulk Import' : 'Hide Bulk Import';
      });
    }

    // bulk add handlers
    const bulkAddBtn = document.getElementById('bulkAddBtn');
    if (bulkAddBtn) bulkAddBtn.addEventListener('click', function (ev) { ev.preventDefault(); registerBulkMembersFromTextarea(); });
    const bulkClear = document.getElementById('bulkClearBtn');
    if (bulkClear) bulkClear.addEventListener('click', function () { document.getElementById('bulkMemberTextarea').value = ''; });

    // Add filter event listeners
    const filterCongregation = document.getElementById('filterCongregation');
    const filterPeriod = document.getElementById('filterPeriod');
    const filterName = document.getElementById('filterName');
    const filterSurname = document.getElementById('filterSurname');
    const filterDOB = document.getElementById('filterDOB');
    const clearFiltersBtn = document.getElementById('clearFilters');

    if (filterCongregation) filterCongregation.addEventListener('change', () => renderAffiliations());
    if (filterPeriod) filterPeriod.addEventListener('input', () => renderAffiliations());
    if (filterName) filterName.addEventListener('input', () => renderAffiliations());
    if (filterSurname) filterSurname.addEventListener('input', () => renderAffiliations());
    if (filterDOB) filterDOB.addEventListener('input', () => renderAffiliations());
    
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        if (filterCongregation) filterCongregation.selectedIndex = 0;
        if (filterPeriod) filterPeriod.value = '';
        if (filterName) filterName.value = '';
        if (filterSurname) filterSurname.value = '';
        if (filterDOB) filterDOB.value = '';
        renderAffiliations();
      });
    }
  }
});

// expose for potential manual reloads
window.loadMembers = loadMembers;

// helper for console / other scripts to add members programmatically
window.addMember = function(memberObj) {
  const db = getDatabase();
  if (!db.Member) db.Member = [];
  db.Member.push(Object.assign({ memberID: generateGUID() }, memberObj));
  saveDatabase(db);
};

function requireCongregation() {
  const congregation = getSelectedCongregation();

  const container = document.getElementById("members-container");

  if (!congregation) {
    container.innerHTML = `
      <div class="alert alert-warning">
        No congregation selected.
      </div>
      <a href="congregations.html" class="btn btn-primary">
        Select Congregation
      </a>
    `;
    return null;
  }

  return congregation;
}
document.addEventListener("DOMContentLoaded", () => {
  const congregation = requireCongregation();
  if (!congregation) return;

  loadMembers();
});