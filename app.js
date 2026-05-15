const STORAGE_KEY = "pintama_web_draft_v1";

const ivaRates = {
  sin: 0,
  general: 0.21,
  reducido: 0.10,
  superreducido: 0.04
};

const unitOptions = [
  ["ud", "ud"],
  ["m2", "m²"],
  ["m3", "m³"],
  ["ml", "ml"]
];

const state = {
  activeItemId: null,
  draftSavedAt: null,
  doc: createEmptyDoc()
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function createEmptyItem() {
  return {
    id: makeId(),
    nombre: "",
    titulo: "",
    descripcion: "",
    unidad: "ud",
    cantidad: 1,
    precioUnitario: 0,
    precioTotal: 0,
    descuento: 0,
    costeReal: 0,
    categoria: ""
  };
}

function createEmptyDoc() {
  return {
    id: makeId(),
    fechaCreacion: todayIso(),
    nombreCliente: "",
    dniCliente: "",
    clienteTelefono: "",
    clienteEmail: "",
    metrosObra: 0,
    materiales: [],
    tipoIVA: "general",
    precioManoObra: 0,
    soloMateriales: false,
    tipoDocumento: "cotizacion",
    estadoPago: "pendiente",
    validez_dias: 15,
    numeroDocumento: 0,
    notas: "",
    fechaPago: "",
    descuento_global: 0,
    usar_total_manual: false,
    total_manual: 0,
    cliente_id: ""
  };
}

const el = {
  tipoDocumento: document.getElementById("tipoDocumento"),
  fechaCreacion: document.getElementById("fechaCreacion"),
  tipoIVA: document.getElementById("tipoIVA"),
  validez_dias: document.getElementById("validez_dias"),
  nombreCliente: document.getElementById("nombreCliente"),
  dniCliente: document.getElementById("dniCliente"),
  clienteTelefono: document.getElementById("clienteTelefono"),
  clienteEmail: document.getElementById("clienteEmail"),
  notas: document.getElementById("notas"),
  usar_total_manual: document.getElementById("usar_total_manual"),
  total_manual: document.getElementById("total_manual"),
  itemsBody: document.getElementById("items-body"),
  selectedDescription: document.getElementById("selected-description"),
  summaryBase: document.getElementById("summary-base"),
  summaryIva: document.getElementById("summary-iva"),
  summaryTotal: document.getElementById("summary-total"),
  draftStatus: document.getElementById("draft-status"),
  fileImport: document.getElementById("file-import")
};

function numberValue(value) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return `${numberValue(value).toFixed(2)} EUR`;
}

function itemTotal(item) {
  const manualTotal = numberValue(item.precioTotal);
  let base = manualTotal > 0.0001
    ? manualTotal
    : numberValue(item.cantidad) * numberValue(item.precioUnitario);
  const discount = numberValue(item.descuento);
  if (discount > 0 && discount <= 100) {
    base = base * (1 - discount / 100);
  }
  return Math.max(0, Math.round(base * 100) / 100);
}

function calculateTotals() {
  const rate = ivaRates[state.doc.tipoIVA] ?? ivaRates.general;
  if (state.doc.usar_total_manual) {
    const total = Math.max(0, numberValue(state.doc.total_manual));
    const base = rate > 0 ? total / (1 + rate) : total;
    return {
      base: Math.round(base * 100) / 100,
      iva: Math.round((total - base) * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  const base = state.doc.materiales.reduce((sum, item) => sum + itemTotal(item), 0);
  const iva = base * rate;
  return {
    base: Math.round(base * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round((base + iva) * 100) / 100
  };
}

function syncFormFromState() {
  el.tipoDocumento.value = state.doc.tipoDocumento || "cotizacion";
  el.fechaCreacion.value = state.doc.fechaCreacion || todayIso();
  el.tipoIVA.value = state.doc.tipoIVA || "general";
  el.validez_dias.value = state.doc.validez_dias ?? 15;
  el.nombreCliente.value = state.doc.nombreCliente || "";
  el.dniCliente.value = state.doc.dniCliente || "";
  el.clienteTelefono.value = state.doc.clienteTelefono || "";
  el.clienteEmail.value = state.doc.clienteEmail || "";
  el.notas.value = state.doc.notas || "";
  el.usar_total_manual.checked = Boolean(state.doc.usar_total_manual);
  el.total_manual.value = numberValue(state.doc.total_manual);
  el.total_manual.disabled = !el.usar_total_manual.checked;
  renderItems();
  renderTotals();
  renderDraftStatus();
}

function syncStateFromForm() {
  state.doc.tipoDocumento = el.tipoDocumento.value;
  state.doc.fechaCreacion = el.fechaCreacion.value || todayIso();
  state.doc.tipoIVA = el.tipoIVA.value;
  state.doc.validez_dias = Math.max(0, Math.round(numberValue(el.validez_dias.value)));
  state.doc.nombreCliente = el.nombreCliente.value.trim();
  state.doc.dniCliente = el.dniCliente.value.trim();
  state.doc.clienteTelefono = el.clienteTelefono.value.trim();
  state.doc.clienteEmail = el.clienteEmail.value.trim();
  state.doc.notas = el.notas.value.trim();
  state.doc.usar_total_manual = el.usar_total_manual.checked;
  state.doc.total_manual = Math.max(0, numberValue(el.total_manual.value));
  el.total_manual.disabled = !state.doc.usar_total_manual;
}

function renderItems() {
  el.itemsBody.innerHTML = "";
  if (!state.doc.materiales.length) {
    state.doc.materiales.push(createEmptyItem());
  }

  state.doc.materiales.forEach((item) => {
    const tr = document.createElement("tr");
    tr.dataset.id = item.id;
    if (item.id === state.activeItemId) {
      tr.classList.add("selected");
    }

    tr.innerHTML = `
      <td data-label="Concepto"><input data-field="titulo" type="text" placeholder="Concepto" value="${escapeAttr(item.titulo || item.nombre || "")}"></td>
      <td data-label="Unidad">
        <select data-field="unidad">
          ${unitOptions.map(([value, label]) => `<option value="${value}" ${item.unidad === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </td>
      <td data-label="Cantidad"><input data-field="cantidad" type="number" min="0" step="0.01" value="${numberValue(item.cantidad)}"></td>
      <td data-label="P.Unit"><input data-field="precioUnitario" type="number" min="0" step="0.01" value="${numberValue(item.precioUnitario)}"></td>
      <td data-label="Total linea"><input data-field="precioTotal" type="number" min="0" step="0.01" value="${numberValue(item.precioTotal)}" title="Opcional: total de esta linea"></td>
      <td data-label="Acciones"><button type="button" class="delete-line" title="Eliminar">Eliminar</button></td>
    `;

    tr.addEventListener("click", (event) => {
      if (event.target.closest("input, select, button, textarea")) {
        return;
      }
      selectItem(item.id);
    });
    tr.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("focus", () => setActiveItem(item.id));
      input.addEventListener("input", (event) => {
        updateItemField(item.id, event.target.dataset.field, event.target.value);
      });
      input.addEventListener("change", (event) => {
        updateItemField(item.id, event.target.dataset.field, event.target.value);
      });
    });
    tr.querySelector(".delete-line").addEventListener("click", (event) => {
      event.stopPropagation();
      deleteItem(item.id);
    });

    el.itemsBody.appendChild(tr);
  });

  if (!state.activeItemId && state.doc.materiales[0]) {
    state.activeItemId = state.doc.materiales[0].id;
  }
  updateDescriptionBox();
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function selectItem(id) {
  setActiveItem(id);
}

function setActiveItem(id) {
  if (state.activeItemId === id) return;
  state.activeItemId = id;
  document.querySelectorAll("#items-body tr").forEach((row) => {
    row.classList.toggle("selected", row.dataset.id === id);
  });
  updateDescriptionBox();
}

function updateItemField(id, field, value) {
  const item = state.doc.materiales.find((x) => x.id === id);
  if (!item) return;

  if (["cantidad", "precioUnitario", "precioTotal", "descuento", "costeReal"].includes(field)) {
    item[field] = Math.max(0, numberValue(value));
  } else {
    item[field] = value;
    if (field === "titulo") {
      item.nombre = value;
    }
  }
  markDirty();
  renderTotals();
}

function updateDescriptionBox() {
  const item = state.doc.materiales.find((x) => x.id === state.activeItemId);
  el.selectedDescription.value = item ? item.descripcion || "" : "";
  el.selectedDescription.disabled = !item;
}

function addItem(shouldSelect = true) {
  const item = createEmptyItem();
  state.doc.materiales.push(item);
  if (shouldSelect) {
    state.activeItemId = item.id;
    markDirty();
  }
  renderItems();
  renderTotals();
}

function deleteItem(id) {
  state.doc.materiales = state.doc.materiales.filter((item) => item.id !== id);
  if (state.activeItemId === id) {
    state.activeItemId = state.doc.materiales[0]?.id || null;
  }
  markDirty();
  renderItems();
  renderTotals();
}

function renderTotals() {
  const totals = calculateTotals();
  el.summaryBase.textContent = money(totals.base);
  el.summaryIva.textContent = money(totals.iva);
  el.summaryTotal.textContent = money(totals.total);
}

function markDirty() {
  syncStateFromForm();
  state.draftSavedAt = null;
  renderDraftStatus();
  autoSaveDraft();
}

function renderDraftStatus() {
  if (state.draftSavedAt) {
    el.draftStatus.textContent = `Guardado en este navegador: ${state.draftSavedAt}`;
  } else {
    el.draftStatus.textContent = "Cambios pendientes";
  }
}

function autoSaveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.doc));
  } catch (err) {
    console.warn("No se pudo guardar el borrador", err);
  }
}

function saveDraft() {
  syncStateFromForm();
  autoSaveDraft();
  state.draftSavedAt = new Date().toLocaleString();
  renderDraftStatus();
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const doc = JSON.parse(raw);
    state.doc = normalizeDoc(doc);
    state.activeItemId = state.doc.materiales[0]?.id || null;
    state.draftSavedAt = "borrador recuperado";
    syncFormFromState();
    return true;
  } catch (err) {
    console.warn("No se pudo cargar el borrador", err);
    return false;
  }
}

function normalizeDoc(doc) {
  const base = createEmptyDoc();
  const merged = { ...base, ...(doc || {}) };
  merged.id = merged.id || makeId();
  merged.numeroDocumento = 0;
  merged.estadoPago = merged.estadoPago || "pendiente";
  merged.tipoDocumento = merged.tipoDocumento === "factura" ? "factura" : "cotizacion";
  merged.tipoIVA = ivaRates[merged.tipoIVA] === undefined ? "general" : merged.tipoIVA;
  merged.fechaCreacion = merged.fechaCreacion || todayIso();
  merged.validez_dias = Math.max(0, Math.round(numberValue(merged.validez_dias || 15)));
  merged.total_manual = Math.max(0, numberValue(merged.total_manual));
  merged.usar_total_manual = Boolean(merged.usar_total_manual);
  merged.materiales = Array.isArray(merged.materiales) ? merged.materiales.map(normalizeItem) : [];
  return merged;
}

function normalizeItem(item) {
  const merged = { ...createEmptyItem(), ...(item || {}) };
  merged.id = merged.id || makeId();
  merged.titulo = merged.titulo || merged.nombre || "";
  merged.nombre = merged.nombre || merged.titulo || "";
  merged.unidad = merged.unidad || "ud";
  merged.cantidad = Math.max(0, numberValue(merged.cantidad || 1));
  merged.precioUnitario = Math.max(0, numberValue(merged.precioUnitario));
  merged.precioTotal = Math.max(0, numberValue(merged.precioTotal));
  merged.descuento = Math.max(0, numberValue(merged.descuento));
  merged.costeReal = Math.max(0, numberValue(merged.costeReal));
  return merged;
}

function buildPintAmaFile() {
  syncStateFromForm();
  const doc = normalizeDoc(state.doc);
  doc.id = makeId();
  doc.numeroDocumento = 0;
  doc.fechaPago = "";
  doc.estadoPago = "pendiente";
  doc.materiales = doc.materiales
    .filter((item) => (item.titulo || item.nombre || item.descripcion || item.precioUnitario || item.precioTotal))
    .map(normalizeItem);
  return {
    _tipo: "pintama_documento",
    _version: 1,
    presupuesto: doc
  };
}

function exportJson() {
  const payload = buildPintAmaFile();
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = makeFilename(payload.presupuesto);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  saveDraft();
}

function makeFilename(doc) {
  const tipo = doc.tipoDocumento === "factura" ? "factura" : "presupuesto";
  const cliente = (doc.nombreCliente || "sin_nombre")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36) || "sin_nombre";
  return `pintama_${tipo}_${cliente}_${doc.fechaCreacion || todayIso()}.json`;
}

function importJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(String(reader.result || ""));
      const doc = raw && raw._tipo === "pintama_documento" ? raw.presupuesto : raw;
      state.doc = normalizeDoc(doc);
      state.activeItemId = state.doc.materiales[0]?.id || null;
      saveDraft();
      syncFormFromState();
    } catch (err) {
      alert("No se pudo importar el archivo JSON.");
    }
  };
  reader.readAsText(file, "utf-8");
}

function newDocument() {
  const hasData = state.doc.nombreCliente || state.doc.notas || state.doc.materiales.some((item) => item.titulo || item.nombre || item.descripcion);
  if (hasData && !confirm("Crear un documento nuevo y limpiar el borrador actual?")) {
    return;
  }
  state.doc = createEmptyDoc();
  state.doc.materiales = [createEmptyItem()];
  state.activeItemId = state.doc.materiales[0].id;
  state.draftSavedAt = null;
  localStorage.removeItem(STORAGE_KEY);
  syncFormFromState();
}

function bindEvents() {
  [
    el.tipoDocumento,
    el.fechaCreacion,
    el.tipoIVA,
    el.validez_dias,
    el.nombreCliente,
    el.dniCliente,
    el.clienteTelefono,
    el.clienteEmail,
    el.notas,
    el.usar_total_manual,
    el.total_manual
  ].forEach((input) => {
    input.addEventListener("input", () => {
      markDirty();
      renderTotals();
    });
    input.addEventListener("change", () => {
      markDirty();
      renderTotals();
    });
  });

  el.selectedDescription.addEventListener("input", () => {
    const item = state.doc.materiales.find((x) => x.id === state.activeItemId);
    if (!item) return;
    item.descripcion = el.selectedDescription.value;
    markDirty();
  });

  document.getElementById("btn-add-line").addEventListener("click", () => addItem(true));
  document.getElementById("btn-save").addEventListener("click", saveDraft);
  document.getElementById("btn-export").addEventListener("click", exportJson);
  document.getElementById("btn-new").addEventListener("click", newDocument);
  document.getElementById("btn-import").addEventListener("click", () => el.fileImport.click());
  el.fileImport.addEventListener("change", (event) => {
    importJsonFile(event.target.files[0]);
    event.target.value = "";
  });
}

function init() {
  bindEvents();
  if (!loadDraft()) {
    state.doc.materiales = [createEmptyItem()];
    state.activeItemId = state.doc.materiales[0].id;
    syncFormFromState();
  }
}

init();
