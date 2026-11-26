/**
 * 🔌 API COMUNITARIA COMPARTIDA (comunidad-api.js <= 90 líneas)
 * Centraliza el cliente RPC de Supabase, sesión local, subida a fotos-puntos y avisos propios
 * para todos los submódulos de Puntos de la Comunidad (cero duplicación).
 */

export const CONFIG_COMUNIDAD = {
  url: 'https://ktnrjoewhhfjbmqyxfij.supabase.co',
  key: 'sb_publishable_mi9MnkRKfMlhk7YUi3rgaQ_hp6Ni393'
};

const CLAVE_SESION = 'gta6_cangel_sesion_hash';
let toastEl = null, timerToast = 0;

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export function obtenerSesionComunidad() {
  try {
    let h = localStorage.getItem(CLAVE_SESION);
    if (!h || h.length < 8) {
      h = `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(CLAVE_SESION, h);
    }
    return h;
  } catch {
    return `cg_tmp_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export async function llamarRpcComunidad(nombreRpc, payload = {}, tokenBearer = '') {
  const headers = { 'Content-Type': 'application/json', apikey: CONFIG_COMUNIDAD.key };
  if (tokenBearer) headers.Authorization = `Bearer ${tokenBearer}`;
  const res = await fetch(`${CONFIG_COMUNIDAD.url}/rest/v1/rpc/${nombreRpc}`, {
    method: 'POST', headers, body: JSON.stringify(payload)
  });
  const dato = await res.json().catch(() => null);
  if (!res.ok) throw new Error(dato?.mensaje || `Error HTTP ${res.status} en ${nombreRpc}`);
  return dato;
}

export async function subirFotoComunidad(puntoId, comp, tokenAdmin = '') {
  const sufijo = Math.random().toString(36).slice(2, 8);
  const carpeta = tokenAdmin ? 'oficiales' : 'propuestas';
  const ruta = `${carpeta}/${puntoId}/${Date.now()}_${sufijo}.${comp.extension}`;
  const headers = { apikey: CONFIG_COMUNIDAD.key, 'Content-Type': comp.mime, 'x-upsert': 'false' };
  if (tokenAdmin) headers.Authorization = `Bearer ${tokenAdmin}`;
  const res = await fetch(`${CONFIG_COMUNIDAD.url}/storage/v1/object/fotos-puntos/${ruta}`, {
    method: 'POST', headers, body: comp.blob
  });
  if (!res.ok) throw new Error('No se pudo subir la fotografía opcional.');
  return { ruta, url: `${CONFIG_COMUNIDAD.url}/storage/v1/object/public/fotos-puntos/${ruta}` };
}

export function mostrarAvisoComunidad(mensaje) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'pc-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = String(mensaje || '');
  toastEl.classList.add('pc-visible');
  clearTimeout(timerToast);
  timerToast = window.setTimeout(() => toastEl?.classList.remove('pc-visible'), 3400);
}
