let budget = null;

const ICONS_MD = {
  revenus: `<svg class="section-icon-main" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  depenses_communes: `<svg class="section-icon-main" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  depenses_fixes: `<svg class="section-icon-main" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  depenses_annuelles: `<svg class="section-icon-main" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
};

const SECTION_META = {
  revenus:           { label: "Revenus",           colorClass: "section-revenus",   num: "I",   annual: false },
  depenses_communes: { label: "Dépenses communes", colorClass: "section-communes",  num: "II",  annual: false },
  depenses_fixes:    { label: "Dépenses fixes",    colorClass: "section-fixes",     num: "III", annual: false },
  depenses_annuelles:{ label: "Annuelles",         colorClass: "section-annuelles", num: "IV",  annual: true  },
};

function fmt(n) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function sectionTotal(section, items) {
  if (SECTION_META[section].annual) {
    return items.reduce((s, i) => s + i.montant_annuel / 12, 0);
  }
  return items.reduce((s, i) => s + i.montant, 0);
}

function computeSummary() {
  const totalRevenus   = sectionTotal("revenus",            budget.revenus);
  const totalCommunes  = sectionTotal("depenses_communes",  budget.depenses_communes);
  const totalFixes     = sectionTotal("depenses_fixes",     budget.depenses_fixes);
  const totalAnnuelles = sectionTotal("depenses_annuelles", budget.depenses_annuelles);
  const totalDepenses  = totalCommunes + totalFixes + totalAnnuelles;
  const roulement      = totalRevenus - totalDepenses;
  return { totalRevenus, totalCommunes, totalFixes, totalAnnuelles, totalDepenses, roulement };
}

function renderSummary() {
  const s = computeSummary();
  const pct = s.totalRevenus > 0
    ? Math.min(100, Math.round((s.roulement / s.totalRevenus) * 100))
    : 0;

  // Hero roulement
  document.getElementById("hero-amount").textContent = fmt(s.roulement);

  const bar      = document.getElementById("progress-bar-fill");
  const barLabel = document.getElementById("progress-bar-label");
  bar.style.width = Math.abs(pct) + "%";
  bar.className  = "progress-fill" + (s.roulement < 0 ? " negative" : "");
  barLabel.textContent = (s.roulement >= 0 ? "+" : "") + pct + "% du revenu";

  // Bilan
  document.getElementById("sum-revenus").textContent   = "+ " + fmt(s.totalRevenus);
  document.getElementById("sum-communes").textContent  = "– " + fmt(s.totalCommunes);
  document.getElementById("sum-fixes").textContent     = "– " + fmt(s.totalFixes);
  document.getElementById("sum-annuelles").textContent = "– " + fmt(s.totalAnnuelles);
  document.getElementById("sum-depenses").textContent  = "– " + fmt(s.totalDepenses);

  // Mobile mini-stats
  document.getElementById("mini-revenus").textContent  = "+ " + fmt(s.totalRevenus);
  document.getElementById("mini-depenses").textContent = "– " + fmt(s.totalDepenses);
}

function makeEditable(cell, currentValue, isNumeric, onSave) {
  const input    = document.createElement("input");
  input.className = "inline-edit";
  input.type     = isNumeric ? "number" : "text";
  input.step     = "0.01";
  input.value    = currentValue;

  const original = cell.innerHTML;
  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  async function save() {
    const val = isNumeric ? parseFloat(input.value) : input.value.trim();
    if (isNumeric && isNaN(val)) { cell.innerHTML = original; return; }
    try { await onSave(val); } catch { cell.innerHTML = original; }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  save();
    if (e.key === "Escape") cell.innerHTML = original;
  });
  input.addEventListener("blur", save);
}

const MOBILE_LIMIT = 3;

function makeItemRow(section, item, meta) {
  const row = document.createElement("div");
  row.className = "section-item";

  // Label
  const labelEl = document.createElement("div");
  labelEl.className = "item-label";
  labelEl.textContent = item.label;
  labelEl.title = "Double-cliquer pour modifier";
  labelEl.addEventListener("dblclick", () => {
    makeEditable(labelEl, item.label, false, async (val) => {
      await api.patchItem(section, item.id, { label: val });
      item.label = val;
      labelEl.textContent = val;
    });
  });

  // Amount
  const amountEl = document.createElement("div");
  amountEl.className = "item-amount";
  amountEl.title = "Double-cliquer pour modifier";

  if (meta.annual) {
    const monthly = item.montant_annuel / 12;
    amountEl.innerHTML = `
      <span class="item-amount-annual">${fmt(item.montant_annuel)}<span style="font-size:11px;font-weight:500;opacity:.7"> /an</span></span>
      <span class="item-amount-monthly">${fmt(monthly)}/mois</span>
    `;
    amountEl.addEventListener("dblclick", () => {
      makeEditable(amountEl, item.montant_annuel, true, async (val) => {
        await api.patchItem(section, item.id, { montant_annuel: val });
        item.montant_annuel = val;
        renderSection(section);
        renderSummary();
      });
    });
  } else {
    amountEl.textContent = fmt(item.montant);
    amountEl.addEventListener("dblclick", () => {
      makeEditable(amountEl, item.montant, true, async (val) => {
        await api.patchItem(section, item.id, { montant: val });
        item.montant = val;
        renderSection(section);
        renderSummary();
      });
    });
  }

  // Delete button
  const delBtn = document.createElement("button");
  delBtn.className = "btn-delete";
  delBtn.title = "Supprimer";
  delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
  delBtn.addEventListener("click", () => confirmDelete(section, item.id, item.label));

  row.appendChild(labelEl);
  row.appendChild(amountEl);
  row.appendChild(delBtn);
  return row;
}

function renderSection(section) {
  const meta      = SECTION_META[section];
  const items     = budget[section];
  const total     = sectionTotal(section, items);
  const container = document.getElementById(`section-${section}`);

  container.innerHTML = "";
  container.className = "budget-section " + meta.colorClass;

  // Title row
  const mainRow = document.createElement("div");
  mainRow.className = "section-header-main";
  mainRow.innerHTML = `
    <div class="section-name-wrap">${ICONS_MD[section]}<span class="section-name">${meta.label}</span></div>
    <span class="section-badge">${fmt(total)}</span>
  `;
  container.appendChild(mainRow);

  // Items list
  const itemsEl = document.createElement("div");
  itemsEl.className = "section-items";

  items.forEach((item, idx) => {
    const row = makeItemRow(section, item, meta);
    if (idx >= MOBILE_LIMIT) row.classList.add("mobile-hidden");
    itemsEl.appendChild(row);
  });

  // Mobile collapse link
  if (items.length > MOBILE_LIMIT) {
    const count       = items.length - MOBILE_LIMIT;
    const moreLink    = document.createElement("div");
    moreLink.className = "section-more-link";
    moreLink.textContent = `+ ${count} autre${count > 1 ? "s" : ""} ligne${count > 1 ? "s" : ""}`;
    moreLink.addEventListener("click", () => {
      itemsEl.querySelectorAll(".mobile-hidden").forEach(el => el.classList.remove("mobile-hidden"));
      moreLink.remove();
    });
    itemsEl.appendChild(moreLink);
  }

  container.appendChild(itemsEl);

  // Footer
  const footer = document.createElement("div");
  footer.className = "section-footer";
  const addBtn = document.createElement("button");
  addBtn.className = "btn-add";
  addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter une ligne`;
  addBtn.addEventListener("click", () => showAddModal(section));
  footer.appendChild(addBtn);
  container.appendChild(footer);
}

function renderAll() {
  Object.keys(SECTION_META).forEach(renderSection);
  renderSummary();
}

// ─── Modal: add item ────────────────────────────────────────────────
function showAddModal(section) {
  const meta      = SECTION_META[section];
  const modal     = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm  = document.getElementById("modal-form");

  modalTitle.textContent = `Ajouter — ${meta.label}`;
  modalForm.innerHTML = `
    <label>Libellé
      <input type="text" id="modal-label" placeholder="Nom de la ligne" autofocus />
    </label>
    <label>${meta.annual ? "Montant annuel (€)" : "Montant (€)"}
      <input type="number" id="modal-montant" step="0.01" min="0" placeholder="0,00" />
    </label>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="modal-cancel">Annuler</button>
      <button type="submit" class="btn-primary">Ajouter</button>
    </div>
  `;

  modal.classList.remove("hidden");
  document.getElementById("modal-label").focus();
  document.getElementById("modal-cancel").addEventListener("click", closeModal);

  modalForm.onsubmit = async (e) => {
    e.preventDefault();
    const label   = document.getElementById("modal-label").value.trim();
    const montant = parseFloat(document.getElementById("modal-montant").value);
    if (!label || isNaN(montant)) return;

    const data = meta.annual ? { label, montant_annuel: montant } : { label, montant };
    const newItem = await api.addItem(section, data);
    budget[section].push(newItem);
    closeModal();
    renderSection(section);
    renderSummary();
  };
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// ─── Modal: confirm delete ─────────────────────────────────────────
function confirmDelete(section, id, label) {
  const modal     = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm  = document.getElementById("modal-form");

  modalTitle.textContent = "Supprimer";
  modalForm.innerHTML = `
    <p class="confirm-text">Supprimer <strong></strong> ?</p>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="modal-cancel">Annuler</button>
      <button type="button" class="btn-danger"    id="modal-confirm-delete">Supprimer</button>
    </div>
  `;
  modalForm.querySelector(".confirm-text strong").textContent = label;

  modal.classList.remove("hidden");
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm-delete").addEventListener("click", async () => {
    await api.deleteItem(section, id);
    budget[section] = budget[section].filter(i => i.id !== id);
    closeModal();
    renderSection(section);
    renderSummary();
  });
}

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ─── Auth ──────────────────────────────────────────────────────────
function showLogin(errorMsg = "") {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-layout").classList.add("hidden");
  if (errorMsg) {
    const el = document.getElementById("login-error");
    el.textContent = errorMsg;
    el.classList.remove("hidden");
  } else {
    document.getElementById("login-error").classList.add("hidden");
  }
  document.getElementById("login-username").focus();
}

function hideLogin(username) {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-layout").classList.remove("hidden");
  document.getElementById("topbar-username").textContent = username;
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  if (!username || !password) return;
  const res = await api.login(username, password);
  if (res.ok) {
    const data = await res.json();
    await init(data.username);
  } else {
    showLogin("Identifiants incorrects.");
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await api.logout();
  showLogin();
});

// ─── Init ──────────────────────────────────────────────────────────
async function init(username) {
  try {
    budget = await api.getBudget();
    hideLogin(username);
    renderAll();
  } catch (err) {
    if (err.message !== "Unauthorized") showLogin(err.message);
  }
}

(async () => {
  const res = await api.me();
  if (res.ok) {
    const { username } = await res.json();
    await init(username);
  } else {
    showLogin();
  }
})();
