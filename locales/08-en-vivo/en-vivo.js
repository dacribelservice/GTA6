/**
 * 🟢 LOCAL #8: CONTADOR DE PERSONAS EN VIVO (en-vivo.js <= 140 líneas)
 * Registra visitantes activos vía Supabase RPC con fetch() nativo (0 KB de SDK,
 * 0 WebSockets). Aislado del Edificio para preservar 100/100 en PageSpeed.
 */

const SUPABASE_URL = 'https://ktnrjoewhhfjbmqyxfij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mi9MnkRKfMlhk7YUi3rgaQ_hp6Ni393';
const INTERVALO_MS = 55_000;
const MIN_REPING_MS = 10_000;
const CLAVE_SESION = 'gta6_cangel_sesion_vivo';
const PATRON_SESION = /^[a-zA-Z0-9_-]{8,64}$/;

let elPill = null, elNum = null, elUnidad = null;
let timerLatido = 0, ultimoPingMs = 0, sesionId = '', iniciado = false;

function crearIdSeguro() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function obtenerSesionId() {
  try {
    const guardado = localStorage.getItem(CLAVE_SESION);
    if (guardado && PATRON_SESION.test(guardado)) return guardado;
    const nuevo = crearIdSeguro();
    localStorage.setItem(CLAVE_SESION, nuevo);
    return nuevo;
  } catch {
    return crearIdSeguro();
  }
}

function cabecerasRpc() {
  const h = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_KEY}`;
  return h;
}

function montarInsignia() {
  if (document.getElementById('badge-en-vivo')) {
    elPill = document.getElementById('badge-en-vivo');
    elNum = document.getElementById('ev-num');
    elUnidad = document.getElementById('ev-unidad');
    return;
  }
  elPill = document.createElement('div');
  elPill.id = 'badge-en-vivo';
  elPill.className = 'barra-edificio ev-pill';
  elPill.setAttribute('role', 'status');
  elPill.setAttribute('aria-live', 'polite');
  elPill.hidden = true;
  elPill.innerHTML =
    `<span class="ev-punto" aria-hidden="true"></span>` +
    `<span class="ev-etiqueta">En vivo</span>` +
    `<span class="ev-sep" aria-hidden="true">·</span>` +
    `<span class="ev-num" id="ev-num">1</span>` +
    `<span class="ev-unidad" id="ev-unidad">persona</span>`;

  const controles = document.getElementById('controles-edificio');
  if (controles) {
    controles.prepend(elPill);
  } else {
    elPill.classList.add('ev-flotante');
    (document.getElementById('edificio-mapa') || document.body).appendChild(elPill);
  }
  elNum = elPill.querySelector('#ev-num');
  elUnidad = elPill.querySelector('#ev-unidad');
}

function pintarConteo(total) {
  const n = Number(total);
  if (!Number.isFinite(n) || n < 1 || !elPill || !elNum || !elUnidad) return;
  const entero = Math.max(1, Math.round(n));
  elNum.textContent = entero.toLocaleString('es');
  elUnidad.textContent = entero === 1 ? 'persona' : 'personas';
  elPill.title = `${entero} ${entero === 1 ? 'persona explorando' : 'personas explorando'} Leonida ahora`;
  elPill.hidden = false;
}

async function enviarPing() {
  if (document.visibilityState === 'hidden' || !sesionId) return;
  ultimoPingMs = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ping_en_vivo`, {
      method: 'POST',
      headers: cabecerasRpc(),
      body: JSON.stringify({ p_sesion: sesionId })
    });
    if (!res.ok) return;
    const total = await res.json();
    pintarConteo(total);
  } catch {
    // Aislamiento silencioso: si falla la red o Supabase, el mapa sigue al 100%
  }
}

function avisarSalida() {
  if (!sesionId) return;
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/salir_en_vivo`, {
      method: 'POST',
      headers: cabecerasRpc(),
      body: JSON.stringify({ p_sesion: sesionId }),
      keepalive: true
    }).catch(() => {});
  } catch {
    // Silencioso al cerrar pestaña
  }
}

function detenerLatido() {
  if (timerLatido) { clearInterval(timerLatido); timerLatido = 0; }
}

function iniciarLatido() {
  detenerLatido();
  timerLatido = window.setInterval(enviarPing, INTERVALO_MS);
}

function manejarVisibilidad() {
  if (document.visibilityState === 'hidden') {
    detenerLatido();
    return;
  }
  if (Date.now() - ultimoPingMs >= MIN_REPING_MS) enviarPing();
  iniciarLatido();
}

export function iniciarEnVivo() {
  if (iniciado || !SUPABASE_URL || !SUPABASE_KEY) return;
  iniciado = true;
  sesionId = obtenerSesionId();
  montarInsignia();

  document.addEventListener('visibilitychange', manejarVisibilidad);
  window.addEventListener('pagehide', avisarSalida);

  const arrancar = () => {
    if (document.visibilityState !== 'hidden') {
      enviarPing();
      iniciarLatido();
    }
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(arrancar, { timeout: 1500 });
  } else {
    window.setTimeout(arrancar, 1200);
  }
}
