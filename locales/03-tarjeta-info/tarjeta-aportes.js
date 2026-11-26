/**
 * 📤 APORTES COMUNITARIOS (tarjeta-aportes.js <= 250 líneas)
 * Carga bajo demanda (0 KB al abrir el mapa). Gestiona los flujos:
 * 4.8 "Subir imagen" y 4.9 "Esta foto no es / Sugerir otra" enviando siempre
 * a revisión del Administrador (nunca reemplaza fotos aprobadas en vivo).
 */

import { comprimirImagenParaMapa } from './compresor-imagen.js';

const SUPABASE_URL = 'https://ktnrjoewhhfjbmqyxfij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mi9MnkRKfMlhk7YUi3rgaQ_hp6Ni393';
const CLAVE_SESION = 'gta6_cangel_sesion_vivo';
const CLAVE_ALIAS = 'gta6_cangel_alias_aporte';
const PATRON_SESION = /^[a-zA-Z0-9_-]{8,64}$/;

let modal = null, compActual = null, estadoModal = null, enviando = false;

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function obtenerSesionHash() {
  try {
    const previa = localStorage.getItem(CLAVE_SESION);
    if (previa && PATRON_SESION.test(previa)) return previa;
    const nueva = (typeof crypto?.randomUUID === 'function')
      ? crypto.randomUUID()
      : `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(CLAVE_SESION, nueva);
    return nueva;
  } catch {
    return `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function leerAliasGuardado() {
  try { return localStorage.getItem(CLAVE_ALIAS) || ''; } catch { return ''; }
}

function guardarAlias(alias) {
  try {
    if (alias) localStorage.setItem(CLAVE_ALIAS, alias);
  } catch { /* sin almacenamiento */ }
}

function liberarCompresion() {
  if (compActual) {
    compActual.liberarPreview();
    compActual = null;
  }
}

function cerrarModal() {
  if (enviando) return;
  liberarCompresion();
  if (!modal) return;
  modal.classList.remove('ti-abierto');
  const nodo = modal;
  modal = null;
  estadoModal = null;
  window.setTimeout(() => nodo.remove(), 220);
}

function actualizarProgreso(porcentaje, texto) {
  if (!modal) return;
  const barra = modal.querySelector('[data-ap-progreso]');
  const fill = modal.querySelector('[data-ap-fill]');
  const msg = modal.querySelector('[data-ap-estado]');
  if (barra) barra.hidden = porcentaje <= 0;
  if (fill) fill.style.width = `${Math.min(100, Math.max(0, porcentaje))}%`;
  if (msg) msg.textContent = texto || '';
}

function pintarVistaPrevia(comp) {
  if (!modal) return;
  const zona = modal.querySelector('[data-ap-zona]');
  const btnEnviar = modal.querySelector('[data-ap-enviar]');
  if (!zona) return;
  zona.innerHTML =
    `<img class="ti-img ti-cargada" src="${comp.previewUrl}" alt="Vista previa 16:9">` +
    `<span class="ti-credito ti-oficial">${comp.pesoOriginalTexto} → ${comp.pesoTexto} · ${comp.extension.toUpperCase()}</span>` +
    `<button type="button" class="ti-ap-cambiar" data-ap-elegir>Cambiar foto</button>`;
  if (btnEnviar) btnEnviar.disabled = false;
  actualizarProgreso(0, `Lista para enviar (${comp.ancho}×${comp.alto} px · sin metadatos EXIF).`);
}

async function manejarArchivoSeleccionado(archivo) {
  if (!archivo || enviando || !modal) return;
  const btnEnviar = modal.querySelector('[data-ap-enviar]');
  if (btnEnviar) btnEnviar.disabled = true;
  actualizarProgreso(25, 'Optimizando imagen a WebP liviano…');

  try {
    const nueva = await comprimirImagenParaMapa(archivo);
    liberarCompresion();
    compActual = nueva;
    pintarVistaPrevia(nueva);
  } catch (err) {
    actualizarProgreso(0, '');
    estadoModal?.mostrarAviso?.(err.message || 'No se pudo procesar la imagen.', true);
  }
}

async function subirArchivoStorage(ruta, comp) {
  const headers = { apikey: SUPABASE_KEY, 'Content-Type': comp.mime, 'x-upsert': 'false' };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos-puntos/${ruta}`, {
    method: 'POST',
    headers,
    body: comp.blob
  });
  if (!res.ok) {
    const det = await res.text().catch(() => '');
    throw new Error(det.includes('Payload too large')
      ? 'La imagen supera el peso permitido por el servidor.'
      : 'No se pudo subir la imagen en este momento.');
  }
}

async function registrarPropuestaRpc(puntoId, ruta, alias, esReporte) {
  const urlImagen = `${SUPABASE_URL}/storage/v1/object/public/fotos-puntos/${ruta}`;
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/proponer_foto_punto`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_punto_id: puntoId,
      p_url_imagen: urlImagen,
      p_ruta_storage: ruta,
      p_autor_alias: alias || 'Anónimo',
      p_sesion_hash: obtenerSesionHash(),
      p_es_reporte: Boolean(esReporte)
    })
  });
  const dato = await res.json().catch(() => null);
  if (!res.ok || !dato?.ok) {
    throw new Error(dato?.mensaje || 'No se pudo enviar tu foto a revisión.');
  }
  return dato;
}

async function enviarPropuesta(e) {
  e.preventDefault();
  if (enviando || !compActual || !estadoModal || !modal) return;
  enviando = true;
  const btnEnviar = modal.querySelector('[data-ap-enviar]');
  const btnCerrar = modal.querySelector('[data-ap-cerrar]');
  if (btnEnviar) btnEnviar.disabled = true;
  if (btnCerrar) btnCerrar.disabled = true;

  try {
    const aliasInput = modal.querySelector('[data-ap-alias]');
    const alias = String(aliasInput?.value || '').trim().slice(0, 24);
    guardarAlias(alias);

    const puntoLimpio = String(estadoModal.ubicacion.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const sufijo = Math.random().toString(36).slice(2, 8);
    const ruta = `propuestas/${puntoLimpio}/${Date.now()}_${sufijo}.${compActual.extension}`;
    const esReporte = estadoModal.modo === 'reportar';

    actualizarProgreso(55, 'Subiendo foto optimizada…');
    await subirArchivoStorage(ruta, compActual);

    actualizarProgreso(85, 'Enviando a revisión…');
    await registrarPropuestaRpc(puntoLimpio, ruta, alias, esReporte);

    actualizarProgreso(100, '¡Enviada!');
    const aviso = estadoModal.mostrarAviso;
    enviando = false;
    cerrarModal();
    aviso?.(
      esReporte
        ? '¡Gracias! Recibimos tu reporte y foto sugerida, la revisaremos para aceptarla.'
        : '¡Gracias! Recibimos tu foto, la revisaremos para aceptarla.'
    );
  } catch (err) {
    enviando = false;
    if (btnEnviar) btnEnviar.disabled = false;
    if (btnCerrar) btnCerrar.disabled = false;
    actualizarProgreso(0, '');
    estadoModal?.mostrarAviso?.(err.message || 'Ocurrió un error al enviar tu foto.', true);
  }
}

export function abrirModalAporte({ modo = 'subir', ubicacion, fotoActual = null, mostrarAviso }) {
  if (!ubicacion) return;
  if (modal) cerrarModal();
  estadoModal = { modo, ubicacion, fotoActual, mostrarAviso };
  const esReporte = modo === 'reportar';

  modal = document.createElement('div');
  modal.className = 'ti-modal-fondo';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', esReporte ? 'Reportar foto y sugerir otra' : 'Subir foto del lugar');

  const bloqueActual = esReporte && fotoActual?.url_imagen
    ? `<div class="ti-ap-actual">` +
        `<img src="${escapar(fotoActual.url_imagen)}" alt="Foto actual">` +
        `<div><strong>Foto actual marcada como incorrecta</strong><span>Seguirá visible hasta que aprobemos tu sugerencia.</span></div>` +
      `</div>`
    : '';

  modal.innerHTML =
    `<form class="ti-modal" novalidate>` +
      `<header class="ti-cabecera">` +
        `<div class="ti-titulos">` +
          `<h3 class="ti-titulo">${esReporte ? 'Esta foto no es · Sugerir otra' : 'Subir foto de este lugar'}</h3>` +
          `<p class="ti-ap-sub">${escapar(ubicacion.titulo)} · Pasa por revisión antes de publicarse.</p>` +
        `</div>` +
        `<button type="button" class="ti-cerrar" data-ap-cerrar aria-label="Cerrar">✕</button>` +
      `</header>` +
      `${bloqueActual}` +
      `<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden data-ap-input>` +
      `<div class="ti-marco">` +
        `<div class="ti-foto-caja ti-ap-zona" data-ap-zona>` +
          `<button type="button" class="ti-vacio ti-ap-drop" data-ap-elegir>` +
            `<strong>Elegir foto desde tu galería o PC</strong>` +
            `<p>Se encuadra en 16:9 y se comprime automático a WebP liviano.</p>` +
          `</button>` +
        `</div>` +
      `</div>` +
      `<label class="ti-campo" for="ti-ap-alias">` +
        `<span>Tu apodo (opcional, sin registro)</span>` +
        `<input id="ti-ap-alias" name="alias" type="text" maxlength="24" placeholder="Ej. LeonidaPro" value="${escapar(leerAliasGuardado())}" data-ap-alias>` +
      `</label>` +
      `<div class="ti-progreso" data-ap-progreso hidden><div class="ti-progreso-fill" data-ap-fill></div></div>` +
      `<p class="ti-ap-estado" data-ap-estado></p>` +
      `<div class="ti-acciones">` +
        `<button type="button" class="ti-btn" data-ap-cerrar>Cancelar</button>` +
        `<button type="submit" class="ti-btn ti-btn-primario" data-ap-enviar disabled>${esReporte ? 'Enviar corrección' : 'Enviar foto'}</button>` +
      `</div>` +
    `</form>`;

  const inputArchivo = modal.querySelector('[data-ap-input]');
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-ap-cerrar]')) return cerrarModal();
    if (e.target.closest('[data-ap-elegir]')) inputArchivo?.click();
  });
  inputArchivo?.addEventListener('change', () => {
    const f = inputArchivo.files?.[0];
    inputArchivo.value = '';
    if (f) manejarArchivoSeleccionado(f);
  });
  modal.querySelector('form')?.addEventListener('submit', enviarPropuesta);

  const onEsc = (e) => {
    if (e.key === 'Escape' && modal) {
      cerrarModal();
      window.removeEventListener('keydown', onEsc);
    }
  };
  window.addEventListener('keydown', onEsc);

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal?.classList.add('ti-abierto'));
}
