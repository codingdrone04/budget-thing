let budget = null;

const ICONS = {
  revenus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  depenses_communes: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  depenses_fixes: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  depenses_annuelles: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
};

const SECTION_META = {
  revenus: { label: "Revenus", colorClass: "section-revenus", annual: false },
  depenses_communes: { label: "Dépenses communes", colorClass: "section-communes", annual: false },
  depenses_fixes: { label: "Dépenses fixes", colorClass: "section-fixes", annual: false },
  depenses_annuelles: { label: "Dépenses annuelles", colorClass: "section-annuelles", annual: true },
};

function fmt(n) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function sectionTotal(section, items) {
  if (SECTION_META[section].annual) {
    return items.reduce((s, i) => s + i.montant_annuel / 12, 0);
  }
  return items.reduce((s, i) => s + i.montant, 0);
}

function computeSummary() {
  const totalRevenus = sectionTotal("revenus", budget.revenus);
  const totalCommunes = sectionTotal("depenses_communes", budget.depenses_communes);
  const totalFixes = sectionTotal("depenses_fixes", budget.depenses_fixes);
  const totalAnnuelles = sectionTotal("depenses_annuelles", budget.depenses_annuelles);
  const totalDepenses = totalCommunes + totalFixes + totalAnnuelles;
  const roulement = totalRevenus - totalDepenses;
  return { totalRevenus, totalCommunes, totalFixes, totalAnnuelles, totalDepenses, roulement };
}

function renderSummary() {
  const s = computeSummary();
  const pct = s.totalRevenus > 0
    ? Math.min(100, Math.round((s.roulement / s.totalRevenus) * 100))
    : 0;

  document.getElementById("sum-revenus").textContent = fmt(s.totalRevenus);
  document.getElementById("sum-communes").textContent = fmt(s.totalCommunes);
  document.getElementById("sum-fixes").textContent = fmt(s.totalFixes);
  document.getElementById("sum-annuelles").textContent = fmt(s.totalAnnuelles);
  document.getElementById("sum-depenses").textContent = fmt(s.totalDepenses);

  const rouEl = document.getElementById("sum-roulement");
  rouEl.textContent = fmt(s.roulement);
  rouEl.className = "summary-value roulement-value " + (s.roulement >= 0 ? "positive" : "negative");

  const bar = document.getElementById("progress-bar-fill");
  const barLabel = document.getElementById("progress-bar-label");
  bar.style.width = Math.abs(pct) + "%";
  bar.className = "progress-fill " + (s.roulement >= 0 ? "positive" : "negative");
  barLabel.textContent = (s.roulement >= 0 ? "+" : "") + pct + "% du revenu disponible";
}

function makeEditable(cell, currentValue, isNumeric, onSave) {
  const input = document.createElement("input");
  input.className = "inline-edit";
  input.type = isNumeric ? "number" : "text";
  input.step = "0.01";
  input.value = isNumeric ? currentValue : currentValue;

  const original = cell.innerHTML;

  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  async function save() {
    const val = isNumeric ? parseFloat(input.value) : input.value.trim();
    if (isNumeric && isNaN(val)) {
      cell.innerHTML = original;
      return;
    }
    try {
      await onSave(val);
    } catch {
      cell.innerHTML = original;
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cell.innerHTML = original;
  });
  input.addEventListener("blur", save);
}

function renderSection(section) {
  const meta = SECTION_META[section];
  const items = budget[section];
  const total = sectionTotal(section, items);

  const container = document.getElementById(`section-${section}`);
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
    <span class="section-title">${ICONS[section]} ${meta.label}</span>
    <span class="section-total ${meta.colorClass}">${fmt(total)}</span>
  `;
  container.appendChild(header);

  const table = document.createElement("table");
  table.className = "budget-table";

  items.forEach((item) => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.className = "cell-label";
    tdLabel.textContent = item.label;
    tdLabel.title = "Double-cliquer pour modifier";
    tdLabel.addEventListener("dblclick", () => {
      makeEditable(tdLabel, item.label, false, async (val) => {
        await api.patchItem(section, item.id, { label: val });
        item.label = val;
        tdLabel.textContent = val;
      });
    });

    const tdMontant = document.createElement("td");
    tdMontant.className = "cell-montant";
    tdMontant.title = "Double-cliquer pour modifier";

    if (meta.annual) {
      const monthly = item.montant_annuel / 12;
      tdMontant.innerHTML = `
        <span class="annual-amount">${fmt(item.montant_annuel)}/an</span>
        <span class="monthly-amount">${fmt(monthly)}/mois</span>
      `;
      tdMontant.addEventListener("dblclick", () => {
        makeEditable(tdMontant, item.montant_annuel, true, async (val) => {
          await api.patchItem(section, item.id, { montant_annuel: val });
          item.montant_annuel = val;
          renderSection(section);
          renderSummary();
        });
      });
    } else {
      tdMontant.textContent = fmt(item.montant);
      tdMontant.addEventListener("dblclick", () => {
        makeEditable(tdMontant, item.montant, true, async (val) => {
          await api.patchItem(section, item.id, { montant: val });
          item.montant = val;
          tdMontant.textContent = fmt(val);
          renderSection(section);
          renderSummary();
        });
      });
    }

    const tdAction = document.createElement("td");
    tdAction.className = "cell-action";
    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    delBtn.title = "Supprimer";
    delBtn.addEventListener("click", () => confirmDelete(section, item.id, item.label));
    tdAction.appendChild(delBtn);

    tr.appendChild(tdLabel);
    tr.appendChild(tdMontant);
    tr.appendChild(tdAction);
    table.appendChild(tr);
  });

  container.appendChild(table);

  const addRow = document.createElement("div");
  addRow.className = "add-row";
  const addBtn = document.createElement("button");
  addBtn.className = "btn-add";
  addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter`;
  addBtn.addEventListener("click", () => showAddModal(section));
  addRow.appendChild(addBtn);
  container.appendChild(addRow);
}

function renderAll() {
  Object.keys(SECTION_META).forEach(renderSection);
  renderSummary();
}

// Modal add
function showAddModal(section) {
  const meta = SECTION_META[section];
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm = document.getElementById("modal-form");

  modalTitle.textContent = `Ajouter — ${meta.label}`;
  modalForm.innerHTML = `
    <label>Libellé
      <input type="text" id="modal-label" placeholder="Nom de la ligne" autofocus />
    </label>
    <label>${meta.annual ? "Montant annuel (€)" : "Montant (€)"}
      <input type="number" id="modal-montant" step="0.01" min="0" placeholder="0.00" />
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
    const label = document.getElementById("modal-label").value.trim();
    const montant = parseFloat(document.getElementById("modal-montant").value);
    if (!label || isNaN(montant)) return;

    const data = meta.annual
      ? { label, montant_annuel: montant }
      : { label, montant };

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

// Confirm delete dialog
function confirmDelete(section, id, label) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm = document.getElementById("modal-form");

  modalTitle.textContent = "Supprimer";
  modalForm.innerHTML = `
    <p class="confirm-text">Supprimer <strong>${label}</strong> ?</p>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="modal-cancel">Annuler</button>
      <button type="button" class="btn-danger" id="modal-confirm-delete">Supprimer</button>
    </div>
  `;

  modal.classList.remove("hidden");

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm-delete").addEventListener("click", async () => {
    await api.deleteItem(section, id);
    budget[section] = budget[section].filter((i) => i.id !== id);
    closeModal();
    renderSection(section);
    renderSummary();
  });
}

// Close modal on backdrop click
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Keyboard nav: scroll to section
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById(link.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

// Init
(async () => {
  try {
    budget = await api.getBudget();
    renderAll();
  } catch (err) {
    document.getElementById("main-content").innerHTML =
      `<div class="error-state">Impossible de charger les données.<br><small>${err.message}</small></div>`;
  }
})();
