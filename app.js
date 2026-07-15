"use strict";

const APPS_SCRIPT_URL = String(window.APPS_SCRIPT_URL || "").trim();
const IS_CONFIGURED = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(APPS_SCRIPT_URL);

const PERSONAS_CONFIG = {
  "alta-tarjeta": {
    label: "Alta de tarjeta",
    description: "Registro de nueva tarjeta Visa o Mastercard.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "marca", label: "Marca", type: "select", options: ["Visa", "Mastercard"] }
    ]
  },
  "habilitacion-tc": {
    label: "Habilitación de TC / MODO",
    description: "Habilitación por llamada o adhesión a MODO.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "marca", label: "Marca", type: "select", options: ["Visa", "Mastercard"] }
    ]
  },
  "activacion-tc": {
    label: "Activación de TC",
    description: "Canje único por DNI. Controla importe y cupones.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "cantidadCupones", label: "Cantidad de cupones", type: "number", min: 1, step: 1 },
      { name: "totalCompra", label: "Total de la compra ($)", type: "number", min: 0, step: 0.01, help: "Para acceder al premio, el monto debe superar $200.000." },
      { name: "marca", label: "Premio", type: "select", options: ["Mochila", "Pelota"] }
    ]
  },
  "elegi-mas": {
    label: "Elegí Más",
    description: "Canje único por ID de voucher.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "idVoucher", label: "ID de voucher", type: "text", maxLength: 60 }
    ]
  },
  prestamos: {
    label: "Préstamos",
    description: "Asesoramiento o solicitud cursada.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "linea", label: "Línea", type: "select", options: ["Adelanto", "Personal", "Viaja+", "Más Autos"] },
      { name: "monto", label: "Monto ($)", type: "number", min: 0, step: 0.01 }
    ]
  },
  seguros: {
    label: "Seguros",
    description: "Producto asesorado o contratado.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "linea", label: "Línea / producto", type: "text", maxLength: 80 },
      { name: "monto", label: "Monto / prima ($)", type: "number", min: 0, step: 0.01 }
    ]
  },
  "app-bna": {
    label: "App BNA+",
    description: "Alta, migración o asesoramiento.",
    campos: [
      { name: "cliente", label: "Cliente", type: "text", maxLength: 80 },
      { name: "dni", label: "DNI", type: "text", inputmode: "numeric", maxLength: 8, pattern: "dni" },
      { name: "accion", label: "Acción", type: "select", options: ["Alta", "Migración nueva app", "Asesoramiento"] }
    ]
  }
};

const SECTORES_COMERCIOS = [
  "Pabellon Artesanos 1",
  "Pabellon Artesanos 2",
  "Poncho Diseño",
  "Carpa Productos Regionales",
  "Carpa Bodega y Delicatessen",
  "Carpa Manualidades",
  "Sector Comercial 1 (Camineria principal)",
  "Feria Verde",
  "Carpa Achalay 1",
  "Carpa Achalay 2",
  "Des. Social GOBIERNO",
  "Des. Social MUNICIPALIDAD SFVC",
  "PCPC",
  "Sector Comercial (Mercado Cultural)",
  "MECA",
  "Food Truck",
  "Food Truck (Mercado Cultural)",
  "Pergola Cafeterias",
  "Colectividades"
];

let sectorActivo = "";


let agente = null;
let tipoFormActual = null;
let historialPantallas = [];
let charts = {};
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function normalizarTexto(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function soloDigitos(value) { return String(value || "").replace(/\D/g, ""); }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
function formatNumber(value) { return new Intl.NumberFormat("es-AR").format(Number(value || 0)); }

function animateNumber(element, target, duration = 500) {
  const start = Number(element.textContent.replace(/\D/g, "")) || 0;
  const end = Number(target) || 0;
  const started = performance.now();
  function tick(now) {
    const progress = Math.min((now - started) / duration, 1);
    element.textContent = formatNumber(Math.round(start + (end - start) * progress));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function getAgenteHeader() { return agente ? `${agente.legajo} · ${agente.nombre} · ${agente.sucursal}` : ""; }

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function setMessage(el, type, text) {
  el.className = `msg${type ? ` ${type}` : ""}`;
  el.textContent = text || "";
}

let modalResolve = null;
function showModal({ title, message = "", type = "success", loading = false, buttonText = "Aceptar" }) {
  const modal = $("#appModal");
  const panel = modal.querySelector(".modal-panel");
  const visual = $("#modalVisual");
  const accept = $("#modalAccept");
  panel.className = "modal-panel";
  if (loading) panel.classList.add("is-loading");
  else if (type === "error") panel.classList.add("is-error");
  else if (type === "warning") panel.classList.add("is-warning");
  visual.textContent = loading ? "" : (type === "error" ? "!" : type === "warning" ? "!" : "✓");
  $("#modalTitle").textContent = title;
  $("#modalMessage").textContent = message;
  accept.textContent = buttonText;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (!loading) setTimeout(() => accept.focus(), 40);
}
function closeModal() {
  const modal = $("#appModal");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (modalResolve) { modalResolve(); modalResolve = null; }
}
function modalAlert(options) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    showModal(options);
  });
}
$("#modalAccept").addEventListener("click", closeModal);
$$("[data-modal-close]").forEach((el) => el.addEventListener("click", () => {
  const panel = $("#appModal .modal-panel");
  if (!panel.classList.contains("is-loading")) closeModal();
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#appModal").hidden && !$("#appModal .modal-panel").classList.contains("is-loading")) closeModal();
});
function setBusy(button, busy, busyText = "Procesando…") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}
function requireConfigured() {
  if (IS_CONFIGURED) return true;
  $("#configAlert").hidden = false;
  showToast("Primero conectá la URL de Apps Script.");
  return false;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error("El servidor no devolvió JSON válido. Revisá la implementación de Apps Script."); }
    if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("La consulta demoró demasiado. Probá nuevamente.");
    throw error;
  } finally { clearTimeout(timer); }
}
async function gsGet(params) {
  if (!requireConfigured()) throw new Error("La app todavía no está conectada.");
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("_", Date.now());
  return fetchJson(url.toString(), { method: "GET", redirect: "follow" });
}
async function gsPost(payload) {
  if (!requireConfigured()) throw new Error("La app todavía no está conectada.");
  return fetchJson(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
}

function mostrarPantalla(id, { push = true } = {}) {
  $$(".screen").forEach((screen) => screen.classList.remove("active"));
  const next = document.getElementById(id);
  if (!next) return;

  next.classList.add("active");
  if (push && historialPantallas.at(-1) !== id) historialPantallas.push(id);
  $("#btnBack").classList.toggle("show", historialPantallas.length > 1);

  const moduleClass =
    id.includes("comercios") ? "theme-comercios" :
    id.includes("personas") ? "theme-personas" :
    id.includes("terminal") ? "theme-terminal" :
    id.includes("links") ? "theme-links" :
    id.includes("dashboard") ? "theme-dashboard" :
    "theme-home";

  document.body.classList.remove(
    "theme-comercios", "theme-personas", "theme-terminal",
    "theme-links", "theme-dashboard", "theme-home"
  );
  document.body.classList.add(moduleClass);

  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "screen-dashboard") cargarDashboard();
}
function irAlMenu() {
  historialPantallas = ["screen-menu"];
  mostrarPantalla("screen-menu", { push: false });
}

function init() {
  $("#configAlert").hidden = IS_CONFIGURED;
  renderSectoresComercios();
  try {
    const saved = localStorage.getItem("poncho_agente") || localStorage.getItem("poncho2026_agente");
    agente = saved ? JSON.parse(saved) : null;
  } catch { localStorage.removeItem("poncho_agente"); localStorage.removeItem("poncho2026_agente"); }

  if (agente?.legajo && agente?.nombre && agente?.sucursal) {
    actualizarChip();
    irAlMenu();
  } else {
    historialPantallas = ["screen-enrolamiento"];
    mostrarPantalla("screen-enrolamiento", { push: false });
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
function actualizarChip() {
  const chip = $("#chipAgente");
  chip.hidden = !agente;
  chip.textContent = agente ? `${agente.legajo} · ${agente.nombre.split(",")[0]}` : "";
}

$("#btnBack").addEventListener("click", () => {
  if (historialPantallas.length <= 1) return;
  historialPantallas.pop();
  mostrarPantalla(historialPantallas.at(-1), { push: false });
});
$("#chipAgente").addEventListener("click", () => {
  if (!confirm("¿Querés cerrar la sesión de este agente en este dispositivo?")) return;
  localStorage.removeItem("poncho_agente"); localStorage.removeItem("poncho2026_agente");
  agente = null;
  actualizarChip();
  historialPantallas = ["screen-enrolamiento"];
  mostrarPantalla("screen-enrolamiento", { push: false });
});

$("#inLegajo").addEventListener("input", (event) => { event.target.value = soloDigitos(event.target.value).slice(0, 5); });
$("#btnEnrolar").addEventListener("click", async () => {
  const nombre = $("#inApellidoNombre").value.trim().replace(/\s+/g, " ");
  const legajo = soloDigitos($("#inLegajo").value);
  const sucursal = $("#inSucursal").value;
  const msg = $("#msgEnrolamiento");
  const btn = $("#btnEnrolar");
  setMessage(msg, "", "");

  if (nombre.length < 4 || !/^\d{5}$/.test(legajo) || !sucursal) {
    setMessage(msg, "warn", "Completá apellido y nombre, un legajo de 5 números y la sucursal.");
    return;
  }

  setBusy(btn, true, "Registrando…");
  try {
    const data = await gsPost({ action: "registrarAgente", legajo, apellidoNombre: nombre, sucursal });
    if (!data.ok) throw new Error(data.error || "No se pudo registrar el agente.");
    agente = { legajo, nombre, sucursal };
    localStorage.setItem("poncho_agente", JSON.stringify(agente));
    actualizarChip();
    await modalAlert({ title: data.nuevo ? "Agente registrado" : "Bienvenido nuevamente", message: `${nombre}\n${sucursal}`, type: "success", buttonText: "Ingresar" });
    irAlMenu();
  } catch (error) { await modalAlert({ title: "No se pudo ingresar", message: error.message, type: "error" }); }
  finally { setBusy(btn, false); }
});

$$('[data-go]').forEach((button) => button.addEventListener("click", () => {
  const destino = button.dataset.go;
  if (destino === "comercios") mostrarPantalla("screen-comercios");
  if (destino === "personas") { renderListaSubmenus(); mostrarPantalla("screen-personas"); }
  if (destino === "links") mostrarPantalla("screen-links");
  if (destino === "dashboard") mostrarPantalla("screen-dashboard");
}));


function renderSectoresComercios() {
  const cont = $("#listaSectores");
  if (!cont) return;
  cont.innerHTML = "";

  SECTORES_COMERCIOS.forEach((sector, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sector-card";
    button.dataset.sector = sector;
    button.setAttribute("role", "listitem");
    button.innerHTML = `
      <span class="sector-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="sector-name">${escapeHtml(sector)}</span>
      <span class="sector-arrow">→</span>`;
    button.addEventListener("click", () => buscarPorSector(sector, button));
    cont.appendChild(button);
  });
}

function actualizarToolbarResultados(titulo, cantidad) {
  const toolbar = $("#resultadosToolbar");
  toolbar.hidden = false;
  $("#resultadosTitulo").textContent = titulo;
  $("#resultadosCantidad").textContent = `${formatNumber(cantidad)} ${cantidad === 1 ? "comercio" : "comercios"}`;
}

function marcarSectorActivo(sector) {
  sectorActivo = sector || "";
  $$(".sector-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.sector === sectorActivo);
  });
  $("#btnLimpiarSector").hidden = !sectorActivo;
}

async function buscarPorSector(sector, button) {
  const cont = $("#resultadosComercios");
  marcarSectorActivo(sector);
  setBusy(button, true, "Cargando…");
  showModal({
    title: "Consultando sector",
    message: sector,
    loading: true
  });
  cont.innerHTML = '<div class="msg info">Cargando comercios del sector…</div>';

  try {
    const data = await gsGet({ action: "buscarComerciosPorSector", sector });
    if (!data.ok) throw new Error(data.error || "No se pudo consultar el sector.");

    const resultados = Array.isArray(data.resultados) ? data.resultados : [];
    closeModal();
    actualizarToolbarResultados(sector, resultados.length);
    renderResultadosComercios(resultados);

    if (!resultados.length) {
      await modalAlert({
        title: "Sector sin comercios",
        message: `No hay registros cargados exactamente como “${sector}”. Revisá que el texto de la columna SECTOR coincida.`,
        type: "warning"
      });
    }
  } catch (error) {
    closeModal();
    cont.innerHTML = `<div class="msg warn">${escapeHtml(error.message)}</div>`;
    await modalAlert({ title: "No se pudo cargar el sector", message: error.message, type: "error" });
  } finally {
    setBusy(button, false);
  }
}

function renderResultadosComercios(resultados) {
  const cont = $("#resultadosComercios");
  cont.innerHTML = "";
  if (!resultados.length) {
    cont.innerHTML = '<div class="empty-state"><strong>Sin resultados</strong><span>No hay comercios para mostrar.</span></div>';
    return;
  }
  resultados.forEach((result) => cont.appendChild(renderResultadoComercio(result)));
}

$("#btnLimpiarSector").addEventListener("click", () => {
  marcarSectorActivo("");
  $("#resultadosToolbar").hidden = true;
  $("#resultadosComercios").innerHTML = "";
});

$("#inBuscarComercio").addEventListener("keydown", (event) => { if (event.key === "Enter") buscarComercio(); });
$("#btnBuscarComercio").addEventListener("click", buscarComercio);
async function buscarComercio() {
  const input = $("#inBuscarComercio");
  const q = input.value.trim();
  const cont = $("#resultadosComercios");
  const btn = $("#btnBuscarComercio");
  if (q.length < 2) { cont.innerHTML = '<div class="msg warn">Ingresá al menos 2 caracteres.</div>'; return; }

  setBusy(btn, true, "Buscando…");
  showModal({ title: "Buscando comercios", message: "Consultando la base de comercios de PONCHO…", loading: true });
  cont.innerHTML = '<div class="msg info">Buscando comercios…</div>';
  try {
    const data = await gsGet({ action: "buscarComercio", q });
    if (!data.ok) throw new Error(data.error || "No se pudo realizar la búsqueda.");
    const resultados = Array.isArray(data.resultados) ? data.resultados : [];
    if (!resultados.length) { closeModal(); marcarSectorActivo(""); actualizarToolbarResultados(`Resultados para “${q}”`, 0); cont.innerHTML = '<div class="empty-state"><strong>Sin coincidencias</strong><span>Probá con otro CUIT, razón social o nombre de fantasía.</span></div>'; await modalAlert({ title: "Sin resultados", message: "No encontramos comercios con esos datos. Probá con CUIT/CUIL, razón social o nombre de fantasía.", type: "warning" }); return; }
    closeModal();
    marcarSectorActivo("");
    actualizarToolbarResultados(`Resultados para “${q}”`, resultados.length);
    renderResultadosComercios(resultados.slice(0, 30));
    if (resultados.length > 30) showToast("Se muestran las primeras 30 coincidencias. Afiná la búsqueda.");
  } catch (error) { closeModal(); cont.innerHTML = `<div class="msg warn">${escapeHtml(error.message)}</div>`; await modalAlert({ title: "Error de búsqueda", message: error.message, type: "error" }); }
  finally { setBusy(btn, false); }
}
function isYes(value) { return ["si", "sí", "true", "1", "x"].includes(normalizarTexto(value)); }
function renderResultadoComercio(result) {
  const promoSi = isYes(result.promo);
  const senalSi = isYes(result.senalizado);
  const card = document.createElement("article");
  card.className = "result-row";

  const nombrePrincipal = result.nombreFantasia || result.razonSocial || "Sin denominación";
  const razonSecundaria = result.nombreFantasia && result.razonSocial && result.nombreFantasia !== result.razonSocial
    ? result.razonSocial
    : "";

  card.innerHTML = `
    <div class="result-head">
      <div class="result-identity">
        <span class="result-sector">${escapeHtml(result.sector || "Sector sin informar")}</span>
        <h3 class="result-title">${escapeHtml(nombrePrincipal)}</h3>
        ${razonSecundaria ? `<div class="result-legal">${escapeHtml(razonSecundaria)}</div>` : ""}
      </div>
      <span class="result-row-number">#${escapeHtml(result.rowNumber)}</span>
    </div>

    <div class="result-data">
      <div><span>CUIT/CUIL</span><strong>${escapeHtml(result.cuit || "—")}</strong></div>
      <div><span>Rubro</span><strong>${escapeHtml(result.rubro || "—")}</strong></div>
      <div><span>+Pagos Nación</span><strong>${escapeHtml(result.masPagos || "—")}</strong></div>
    </div>

    <div class="tags">
      <span class="tag ${promoSi ? "si" : "no"}">Promo ${promoSi ? "aceptada" : "pendiente"}</span>
      <span class="tag ${senalSi ? "si" : "no"}">${senalSi ? "Señalizado" : "Sin señalizar"}</span>
    </div>
    <div class="action-row"></div>`;

  const actions = card.querySelector(".action-row");
  const promoBtn = document.createElement("button");
  promoBtn.className = `btn ${promoSi ? "btn-danger" : "btn-secondary"}`;
  promoBtn.textContent = promoSi ? "Quitar Promo" : "Marcar Promo";
  promoBtn.addEventListener("click", () => actualizarComercio(result.rowNumber, !promoSi, senalSi, promoBtn));

  const signalBtn = document.createElement("button");
  signalBtn.className = `btn ${senalSi ? "btn-danger" : "btn-secondary"}`;
  signalBtn.textContent = senalSi ? "Quitar señalización" : "Marcar señalizado";
  signalBtn.addEventListener("click", () => actualizarComercio(result.rowNumber, promoSi, !senalSi, signalBtn));
  const terminalBtn = document.createElement("button");
  terminalBtn.className = "btn btn-terminal";
  terminalBtn.textContent = "Registrar terminal";
  terminalBtn.addEventListener("click", () => abrirRegistroTerminal(result.cuit || ""));

  actions.append(promoBtn, signalBtn, terminalBtn);
  return card;
}
async function actualizarComercio(rowNumber, promo, senalizado, button) {
  setBusy(button, true, "Guardando…");
  showModal({ title: "Actualizando comercio", message: "Guardando el estado y los datos del agente…", loading: true });
  try {
    const data = await gsPost({ action: "actualizarComercio", rowNumber, promo: promo ? "Si" : "No", senalizado: senalizado ? "Si" : "No", agente: getAgenteHeader() });
    if (!data.ok) throw new Error(data.error || "No se pudo actualizar el comercio.");
    closeModal();
    await modalAlert({ title: "Comercio actualizado", message: `Promo aceptada: ${promo ? "SÍ" : "NO"}\nSeñalizado: ${senalizado ? "SÍ" : "NO"}`, type: "success" });
    await buscarComercio();
  } catch (error) { closeModal(); await modalAlert({ title: "No se pudo actualizar", message: error.message, type: "error" }); }
  finally { setBusy(button, false); }
}

function renderListaSubmenus() {
  const cont = $("#listaSubmenus");
  cont.innerHTML = "";
  Object.entries(PERSONAS_CONFIG).forEach(([key, config]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "submenu-btn";
    button.innerHTML = `<strong>${escapeHtml(config.label)}</strong><span>${escapeHtml(config.description)}</span>`;
    button.addEventListener("click", () => abrirFormPersonas(key));
    cont.appendChild(button);
  });
}
function abrirFormPersonas(tipo) {
  tipoFormActual = tipo;
  const config = PERSONAS_CONFIG[tipo];
  $("#tituloForm").textContent = config.label;
  $("#subtituloForm").textContent = config.description;
  const form = $("#formPersonas");
  form.innerHTML = "";

  config.campos.forEach((campo) => {
    const wrap = document.createElement("div");
    wrap.className = "field-wrap";
    const label = document.createElement("label");
    label.htmlFor = `field-${campo.name}`;
    label.textContent = campo.label;
    wrap.appendChild(label);

    let control;
    if (campo.type === "select") {
      control = document.createElement("select");
      control.innerHTML = '<option value="">Seleccionar…</option>' + campo.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
    } else {
      control = document.createElement("input");
      control.type = campo.type;
      if (campo.inputmode) control.inputMode = campo.inputmode;
      if (campo.maxLength) control.maxLength = campo.maxLength;
      if (campo.min !== undefined) control.min = campo.min;
      if (campo.step !== undefined) control.step = campo.step;
      if (campo.pattern === "dni") control.addEventListener("input", (event) => { event.target.value = soloDigitos(event.target.value).slice(0, 8); });
    }
    control.id = `field-${campo.name}`;
    control.name = campo.name;
    control.required = true;
    wrap.appendChild(control);
    if (campo.help) { const help = document.createElement("small"); help.className = "field-help"; help.textContent = campo.help; wrap.appendChild(help); }
    form.appendChild(wrap);
  });

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = "Registrar acción";
  form.appendChild(submit);
  form.onsubmit = (event) => { event.preventDefault(); registrarPersona(submit); };
  setMessage($("#msgPersonas"), "", "");
  mostrarPantalla("screen-form-personas");
}
async function registrarPersona(button) {
  const config = PERSONAS_CONFIG[tipoFormActual];
  const form = $("#formPersonas");
  const msg = $("#msgPersonas");
  const payload = { action: "registrarPersona", tipo: tipoFormActual, agente: getAgenteHeader() };
  let invalid = false;

  config.campos.forEach((campo) => {
    const control = form.elements[campo.name];
    let value = String(control.value || "").trim();
    if (campo.pattern === "dni") value = soloDigitos(value);
    const validDni = campo.pattern !== "dni" || /^\d{7,8}$/.test(value);
    const valid = value !== "" && validDni && (campo.type !== "number" || Number(value) >= Number(campo.min ?? 0));
    control.setAttribute("aria-invalid", String(!valid));
    if (!valid) invalid = true;
    payload[campo.name] = value;
  });

  if (tipoFormActual === "activacion-tc" && Number(payload.totalCompra) <= 200000) {
    await modalAlert({ title: "Monto insuficiente", message: "El monto informado no supera $200.000. Revisalo antes de entregar la mochila.", type: "warning" });
    return;
  }
  if (invalid) { await modalAlert({ title: "Revisá los datos", message: "Hay campos incompletos o inválidos. El DNI debe tener 7 u 8 números.", type: "warning" }); return; }

  setBusy(button, true, "Registrando…");
  setMessage(msg, "", "");
  showModal({ title: "Registrando acción", message: "Guardando la información en Google Sheets…", loading: true });
  try {
    const data = await gsPost(payload);
    if (!data.ok) throw new Error(data.error || "No se pudo registrar la acción.");
    closeModal();
    if (data.duplicado) { await modalAlert({ title: "Registro ya existente", message: data.mensaje, type: "warning" }); return; }
    form.reset();
    await modalAlert({ title: "Acción registrada", message: data.mensaje || "La información se guardó correctamente en Google Sheets.", type: "success" });
    historialPantallas.pop();
    mostrarPantalla("screen-personas", { push: false });
  } catch (error) { closeModal(); await modalAlert({ title: "No se pudo registrar", message: error.message, type: "error" }); }
  finally { setBusy(button, false); }
}


function abrirRegistroTerminal(cuit = "") {
  $("#inTerminalCuit").value = cuit || "";
  $("#inTerminalOperacion").value = "";
  $("#inTerminalSerie").value = "";
  setMessage($("#msgTerminal"), "", "");
  mostrarPantalla("screen-terminal");
}

$("#btnAbrirTerminal").addEventListener("click", () => abrirRegistroTerminal(""));
$("#inTerminalCuit").addEventListener("input", (event) => {
  event.target.value = soloDigitos(event.target.value).slice(0, 11);
});

$("#formTerminal").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = $("#btnRegistrarTerminal");
  const cuit = soloDigitos($("#inTerminalCuit").value);
  const operacion = $("#inTerminalOperacion").value;
  const numeroSerie = $("#inTerminalSerie").value.trim();

  if (!/^\d{11}$/.test(cuit)) {
    await modalAlert({
      title: "CUIT/CUIL inválido",
      message: "Ingresá los 11 números del CUIT/CUIL del comercio.",
      type: "warning"
    });
    return;
  }
  if (!["Entrega", "Venta"].includes(operacion)) {
    await modalAlert({
      title: "Seleccioná la operación",
      message: "Indicá si la terminal fue entregada o vendida.",
      type: "warning"
    });
    return;
  }
  if (numeroSerie.length < 3) {
    await modalAlert({
      title: "Número de serie incompleto",
      message: "Ingresá el número de serie de la terminal.",
      type: "warning"
    });
    return;
  }

  setBusy(button, true, "Registrando…");
  showModal({
    title: "Registrando terminal",
    message: "Validando el CUIT y guardando la operación…",
    loading: true
  });

  try {
    const data = await gsPost({
      action: "registrarTerminal",
      cuit,
      operacion,
      numeroSerie,
      agente: getAgenteHeader()
    });

    if (!data.ok) throw new Error(data.error || "No se pudo registrar la terminal.");

    closeModal();
    $("#formTerminal").reset();

    await modalAlert({
      title: "Terminal registrada",
      message:
        `${data.operacion}: ${data.numeroSerie}\n` +
        `${data.nombreComercio || data.razonSocial || "Comercio"}\n` +
        `CUIT/CUIL: ${data.cuit}`,
      type: "success"
    });

    historialPantallas.pop();
    mostrarPantalla("screen-comercios", { push: false });
  } catch (error) {
    closeModal();
    await modalAlert({
      title: "No se pudo registrar",
      message: error.message,
      type: "error"
    });
  } finally {
    setBusy(button, false);
  }
});

$("#btnRefrescarDashboard").addEventListener("click", cargarDashboard);
async function cargarDashboard() {
  const kpis = $("#kpis");
  const status = $("#dashboardStatus");
  status.textContent = "Actualizando datos…";
  kpis.innerHTML = '<div class="msg info">Cargando tablero…</div>';
  try {
    if (typeof Chart === "undefined") throw new Error("No se pudo cargar Chart.js. Revisá la conexión a Internet.");
    const data = await gsGet({ action: "dashboardResumen" });
    if (!data.ok) throw new Error(data.error || "No se pudo cargar el dashboard.");

    kpis.innerHTML = `
      <article class="kpi"><div class="num">${formatNumber(data.totalRegistros)}</div><div class="lbl">Registros de personas</div></article>
      <article class="kpi"><div class="num">${formatNumber(data.comercios.total)}</div><div class="lbl">Comercios inscriptos</div></article>
      <article class="kpi"><div class="num">${formatNumber(data.comercios.promo)}</div><div class="lbl">Con Promo aceptada</div></article>
      <article class="kpi"><div class="num">${formatNumber(data.comercios.senalizado)}</div><div class="lbl">Comercios señalizados</div></article>`;

    const tipos = Object.keys(data.datosPorTipo || {});
    renderChart("chartModulos", "bar", tipos.map((key) => data.datosPorTipo[key].label), [{ label: "Registros", data: tipos.map((key) => data.datosPorTipo[key].cantidad), backgroundColor: "#079ec0", borderRadius: 7 }]);

    const daily = Array.isArray(data.serieDiaria) ? data.serieDiaria : [];
    renderChart("chartDiario", "line", daily.map((row) => row.dia), tipos.map((key, index) => ({ label: data.datosPorTipo[key].label, data: daily.map((row) => row[key] || 0), borderColor: palette(index), backgroundColor: palette(index), pointRadius: 2, tension: .28, fill: false })));

    const agents = Array.isArray(data.topAgentes) ? data.topAgentes : [];
    renderChart("chartAgentes", "bar", agents.map((item) => item.agente), [{ label: "Registros", data: agents.map((item) => item.cantidad), backgroundColor: "#232b4d", borderRadius: 6 }], { indexAxis: "y" });

    const commerce = data.comercios || { total: 0, promo: 0, senalizado: 0, ambos: 0 };
    const ambos = Number(commerce.ambos || 0);
    const soloPromo = Math.max(Number(commerce.promo || 0) - ambos, 0);
    const soloSenal = Math.max(Number(commerce.senalizado || 0) - ambos, 0);
    const sinGestion = Math.max(Number(commerce.total || 0) - ambos - soloPromo - soloSenal, 0);
    renderChart("chartComercios", "doughnut", ["Promo y señalizado", "Solo Promo", "Solo señalizado", "Sin gestión"], [{ data: [ambos, soloPromo, soloSenal, sinGestion], backgroundColor: ["#079ec0", "#c3a13d", "#aab9df", "#d9e3e4"], borderWidth: 0 }], {}, true);

    status.textContent = `Última actualización: ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "medium" }).format(new Date())}`;
  } catch (error) {
    kpis.innerHTML = `<div class="msg warn">${escapeHtml(error.message)}</div>`;
    status.textContent = "No fue posible actualizar el tablero.";
  }
}
function palette(index) { return ["#00A7C4", "#FF9654", "#0B6D7A", "#C2A24A", "#3454D1", "#4F7C6E", "#7A5CA8"][index % 7]; }
function renderChart(canvasId, type, labels, datasets, extraOptions = {}, legend = type === "line" || type === "doughnut") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: legend, position: "bottom", labels: { boxWidth: 10, usePointStyle: true } } },
      scales: type === "doughnut" ? {} : { x: { grid: { display: false }, ticks: { maxRotation: 35, minRotation: 0 } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(96,112,116,.12)" } } },
      ...extraOptions
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
