/**
 * 🎯 CREADOR DE PUNTOS COMUNITARIOS — MIRA CENTRAL + MODAL (creador-puntos.js)
 * Carga 100% bajo demanda (0 KB al abrir el mapa). Calcula (x, y) desde edificio:vista-cambiada
 * sin modificar visor-mapa.js. Incluye las 76 categorías + "Otro", galería plana SVG y foto opcional.
 */

import {
  esc, obtenerSesionComunidad, llamarRpcComunidad, subirFotoComunidad, mostrarAvisoComunidad
} from './comunidad-api.js';
import { obtenerVistaComunidad, obtenerCategoriasComunidad } from './puntos-comunidad.js';

const CLAVE_ALIAS = 'gta6_cangel_alias_aporte';
const CLAVE_TOKEN_ADMIN = 'gta6_cangel_admin_token';
const REGIONES_CENTROS = [
  { nombre: 'Mount Kalaga National Park', x: 48.0, y: 24.5 }, { nombre: 'Ambrosia', x: 56.5, y: 38.0 },
  { nombre: 'Port Gellhorn', x: 38.5, y: 48.5 }, { nombre: 'Vice City', x: 61.5, y: 55.5 },
  { nombre: 'Grassrivers', x: 48.5, y: 69.5 }, { nombre: 'Leonida Keys', x: 44.5, y: 82.5 }
];

let ctxRef = null, capaMira = null, modal = null, compFoto = null, enviando = false;
let listenerVista = null, listenerEsc = null, coordsActual = { x: 50, y: 50, valida: true };
let iconoElegido = 'icono-comunidad-otro', colorElegido = '#ff2a85', datosCat = null;
const mapaCats = new Map();

const leerStorage = (k, s = localStorage) => { try { return s.getItem(k) || ''; } catch { return ''; } };
const guardarAlias = (a) => { try { if (a) localStorage.setItem(CLAVE_ALIAS, a); } catch {} };

function calcularCentroMapa(v) {
  const escEl = document.getElementById('escenario-mapa');
  if (!escEl || !v) return { x: 50, y: 50, valida: true };
  const r = escEl.getBoundingClientRect();
  const base = (v.tamanoBase || 1536) * (v.escala || 1);
  if (!base) return { x: 50, y: 50, valida: true };
  const x = ((r.width / 2 - (v.tx || 0)) / base) * 100;
  const y = ((r.height / 2 - (v.ty || 0)) / base) * 100;
  const valida = x >= 0 && x <= 100 && y >= 0 && y <= 100;
  return { x: Number(Math.min(100, Math.max(0, x)).toFixed(2)), y: Number(Math.min(100, Math.max(0, y)).toFixed(2)), valida };
}

function regionMasCercana(x, y) {
  let mejor = REGIONES_CENTROS[3].nombre, minD = Infinity;
  for (const r of REGIONES_CENTROS) {
    const d = Math.hypot(x - r.x, y - r.y);
    if (d < minD) { minD = d; mejor = r.nombre; }
  }
  return mejor;
}

async function asegurarCategorias() {
  if (datosCat) return datosCat;
  datosCat = obtenerCategoriasComunidad();
  if (!datosCat) {
    const res = await fetch('datos/categorias.json');
    if (res.ok) datosCat = await res.json();
  }
  mapaCats.clear();
  mapaCats.set('otro', { id: 'otro', nombre: 'Otro (Comunidad)', icono: 'icono-comunidad-otro', color: '#ff2a85' });
  for (const g of datosCat?.grupos || []) {
    for (const c of g.categorias || []) mapaCats.set(c.id, c);
  }
  return datosCat;
}

function listarIconosSprite() {
  const ids = [];
  const vistos = new Set(['icono-comunidad-otro', 'icono-helipuerto']);
  ids.push('icono-comunidad-otro', 'icono-helipuerto');
  document.querySelectorAll('#sprite-iconos-ign symbol[id^="icono-"]').forEach((sym) => {
    if (!vistos.has(sym.id)) { vistos.add(sym.id); ids.push(sym.id); }
  });
  return ids;
}

function alternarFab(ocultar) {
  const fab = document.getElementById('pc-fab-proponer');
  if (fab) fab.hidden = Boolean(ocultar);
}

function cerrarMira(restaurarFab = true) {
  if (listenerVista) { window.removeEventListener('edificio:vista-cambiada', listenerVista); listenerVista = null; }
  if (listenerEsc) { window.removeEventListener('keydown', listenerEsc); listenerEsc = null; }
  capaMira?.remove(); capaMira = null;
  if (restaurarFab) alternarFab(false);
}

function liberarFoto() {
  compFoto?.liberarPreview?.();
  compFoto = null;
}

function cerrarModal() {
  if (enviando) return;
  liberarFoto();
  if (listenerEsc) { window.removeEventListener('keydown', listenerEsc); listenerEsc = null; }
  if (!modal) return;
  modal.classList.remove('ti-abierto');
  const nodo = modal; modal = null;
  window.setTimeout(() => nodo.remove(), 220);
  alternarFab(false);
}

function actualizarLecturaMira(v) {
  coordsActual = calcularCentroMapa(v);
  const elC = capaMira?.querySelector('[data-cp-coords]');
  const btnOk = capaMira?.querySelector('[data-cp-fijar]');
  if (elC) {
    elC.textContent = coordsActual.valida
      ? `X: ${coordsActual.x.toFixed(1)}% · Y: ${coordsActual.y.toFixed(1)}%`
      : 'Mueve la mira dentro de Leonida';
    elC.classList.toggle('cp-fuera', !coordsActual.valida);
  }
  if (btnOk) btnOk.disabled = !coordsActual.valida;
}

function abrirModoMira() {
  cerrarMira(false);
  cerrarModal();
  alternarFab(true);

  capaMira = document.createElement('div');
  capaMira.className = 'cp-mira-capa';
  capaMira.innerHTML =
    `<div class="cp-mira-centro" aria-hidden="true">` +
      `<svg class="cp-mira-svg" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">` +
        `<circle cx="22" cy="22" r="13"/><circle cx="22" cy="22" r="2.2" fill="currentColor"/>` +
        `<path d="M22 3v7M22 34v7M3 22h7M34 22h7"/>` +
      `</svg>` +
    `</div>` +
    `<div class="cp-barra-mira" role="region" aria-label="Posicionar punto comunitario">` +
      `<span class="cp-mira-texto">Mueve o acerca el mapa y apunta la mira al lugar exacto</span>` +
      `<span class="cp-mira-coords" data-cp-coords>X: 50.0% · Y: 50.0%</span>` +
      `<div class="cp-mira-btns">` +
        `<button type="button" class="ti-btn" data-cp-cancelar>Cancelar</button>` +
        `<button type="button" class="ti-btn ti-btn-primario" data-cp-fijar>Colocar aquí</button>` +
      `</div>` +
    `</div>`;

  const barra = capaMira.querySelector('.cp-barra-mira');
  barra?.addEventListener('pointerdown', (e) => e.stopPropagation());
  barra?.addEventListener('click', (e) => {
    if (e.target.closest('[data-cp-cancelar]')) return cerrarMira(true);
    if (e.target.closest('[data-cp-fijar]') && coordsActual.valida) {
      const fijo = { ...coordsActual };
      cerrarMira(false);
      abrirModalFormulario(fijo);
    }
  });

  listenerVista = (e) => actualizarLecturaMira(e.detail);
  listenerEsc = (e) => { if (e.key === 'Escape') cerrarMira(true); };
  window.addEventListener('edificio:vista-cambiada', listenerVista);
  window.addEventListener('keydown', listenerEsc);

  document.body.appendChild(capaMira);
  actualizarLecturaMira(obtenerVistaComunidad());
  ctxRef?.emitir('edificio:solicitar-vista');
}

function pintarZonaFoto() {
  const zona = modal?.querySelector('[data-cp-foto-zona]');
  if (!zona) return;
  if (!compFoto) {
    zona.innerHTML =
      `<button type="button" class="ti-vacio ti-ap-drop" data-cp-elegir-foto>` +
        `<strong>Foto opcional (16:9)</strong>` +
        `<p>Se comprime automático a ≤ 960 px / ≤ 100 KB y sin EXIF.</p>` +
      `</button>`;
    return;
  }
  zona.innerHTML =
    `<img class="ti-img ti-cargada" src="${compFoto.previewUrl}" alt="Vista previa 16:9">` +
    `<span class="ti-credito ti-oficial">${compFoto.pesoOriginalTexto} → ${compFoto.pesoTexto} · ${compFoto.extension.toUpperCase()}</span>` +
    `<button type="button" class="cp-quitar-foto" data-cp-quitar-foto>Quitar</button>` +
    `<button type="button" class="ti-ap-cambiar" data-cp-elegir-foto>Cambiar</button>`;
}

function sincronizarGaleria() {
  if (!modal) return;
  modal.querySelectorAll('.cp-icono-btn').forEach((b) => {
    b.style.setProperty('--cp-color', colorElegido);
    const on = b.dataset.cpIcono === iconoElegido;
    b.classList.toggle('activo', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

async function seleccionarFotoArchivo(archivo) {
  if (!archivo || enviando || !modal) return;
  const errEl = modal.querySelector('[data-cp-error]');
  if (errEl) errEl.textContent = 'Optimizando imagen…';
  try {
    const { comprimirImagenParaMapa } = await import('../03-tarjeta-info/compresor-imagen.js');
    const nueva = await comprimirImagenParaMapa(archivo);
    liberarFoto();
    compFoto = nueva;
    pintarZonaFoto();
    if (errEl) errEl.textContent = '';
  } catch (err) {
    if (errEl) errEl.textContent = err.message || 'No se pudo procesar la imagen.';
  }
}

async function enviarFormulario(e, coords) {
  e.preventDefault();
  if (enviando || !modal) return;
  const errEl = modal.querySelector('[data-cp-error]'), btnEnviar = modal.querySelector('[data-cp-enviar]');
  const titulo = String(modal.querySelector('[data-cp-titulo]')?.value || '').trim();
  const descripcion = String(modal.querySelector('[data-cp-desc]')?.value || '').trim();
  const categoriaId = String(modal.querySelector('[data-cp-cat]')?.value || 'otro');
  const region = String(modal.querySelector('[data-cp-region]')?.value || 'Vice City');
  const alias = String(modal.querySelector('[data-cp-alias]')?.value || '').trim().slice(0, 24);
  if (titulo.length < 2) {
    if (errEl) errEl.textContent = 'Escribe un título corto de al menos 2 caracteres.';
    modal.querySelector('[data-cp-titulo]')?.focus();
    return;
  }
  enviando = true;
  if (btnEnviar) btnEnviar.disabled = true;
  if (errEl) errEl.textContent = compFoto ? 'Subiendo foto y guardando punto…' : 'Enviando punto…';
  try {
    guardarAlias(alias);
    const tokenAdmin = leerStorage(CLAVE_TOKEN_ADMIN, sessionStorage);
    const puntoId = `com_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const fotoSubida = compFoto ? await subirFotoComunidad(puntoId, compFoto, tokenAdmin) : null;
    const res = await llamarRpcComunidad('proponer_punto_comunidad', {
      p_id: puntoId, p_titulo: titulo, p_descripcion: descripcion,
      p_categoria_id: categoriaId, p_icono_id: iconoElegido, p_color: colorElegido,
      p_region: region, p_x: coords.x, p_y: coords.y,
      p_autor_alias: alias || (tokenAdmin ? 'CANGEL' : 'Anónimo'),
      p_sesion_hash: obtenerSesionComunidad(),
      p_url_imagen: fotoSubida?.url || null, p_ruta_storage: fotoSubida?.ruta || null
    }, tokenAdmin);
    if (!res?.ok) throw new Error(res?.mensaje || 'No se pudo registrar el punto.');
    enviando = false; cerrarModal();
    if (res.estado === 'aprobado') {
      ctxRef?.emitir('comunidad:alternar', { activo: true });
      ctxRef?.emitir('comunidad:recargar', {});
      if (fotoSubida) ctxRef?.emitir('tarjeta:foto-actualizada', { puntoId: res.id });
      mostrarAvisoComunidad('Punto publicado en vivo en Comunidad (Admin).');
    } else {
      mostrarAvisoComunidad('¡Gracias! Recibimos tu punto, lo revisaremos para publicarlo en Comunidad.');
    }
  } catch (err) {
    enviando = false;
    if (btnEnviar) btnEnviar.disabled = false;
    if (errEl) errEl.textContent = err.message || 'Ocurrió un error al enviar tu punto.';
  }
}

async function abrirModalFormulario(coords) {
  await asegurarCategorias();
  const iconos = listarIconosSprite();
  const tokenAdmin = leerStorage(CLAVE_TOKEN_ADMIN, sessionStorage);
  const regionSug = regionMasCercana(coords.x, coords.y);
  iconoElegido = 'icono-comunidad-otro';
  colorElegido = '#ff2a85';

  const optGrupos = (datosCat?.grupos || []).map((g) => (
    `<optgroup label="${esc(g.nombre)}">${g.categorias.map((c) => (
      `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`
    )).join('')}</optgroup>`
  )).join('');
  const optRegiones = (datosCat?.regiones || REGIONES_CENTROS.map((r) => r.nombre)).map((r) => (
    `<option value="${esc(r)}"${r === regionSug ? ' selected' : ''}>${esc(r)}</option>`
  )).join('');
  const btnsIconos = iconos.map((id) => (
    `<button type="button" class="cp-icono-btn" data-cp-icono="${esc(id)}" title="${esc(id.replace(/^icono-/, ''))}" aria-pressed="false">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${esc(id)}"></use></svg>` +
    `</button>`
  )).join('');

  modal = document.createElement('div');
  modal.className = 'ti-modal-fondo';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Proponer punto comunitario');
  modal.innerHTML =
    `<form class="cp-modal" novalidate>` +
      `<header class="ti-cabecera">` +
        `<div class="ti-titulos">` +
          `<h3 class="ti-titulo">Proponer punto${tokenAdmin ? '<span class="cp-badge-admin">Admin directo</span>' : ''}</h3>` +
          `<p class="ti-ap-sub">Coordenadas X: ${coords.x.toFixed(1)}% · Y: ${coords.y.toFixed(1)}% · ${tokenAdmin ? 'Se publicará en vivo.' : 'Pasa por revisión.'}</p>` +
        `</div>` +
        `<button type="button" class="ti-cerrar" data-cp-cerrar aria-label="Cerrar">✕</button>` +
      `</header>` +
      `<label class="cp-campo"><span>Título corto *</span><input name="titulo" type="text" maxlength="80" required placeholder="Ej. Helipuerto oculto del puerto" data-cp-titulo></label>` +
      `<div class="cp-fila-2">` +
        `<label class="cp-campo"><span>Categoría</span><select name="categoria" data-cp-cat><option value="otro" selected>Otro (Comunidad)</option>${optGrupos}</select></label>` +
        `<label class="cp-campo"><span>Región</span><select name="region" data-cp-region>${optRegiones}</select></label>` +
      `</div>` +
      `<div class="cp-galeria-wrap">` +
        `<div class="cp-galeria-head"><span>Icono en el mapa</span><span class="cp-galeria-sub">Puedes elegir cualquiera</span></div>` +
        `<div class="cp-galeria">${btnsIconos}</div>` +
      `</div>` +
      `<label class="cp-campo"><span>Descripción (opcional)</span><textarea name="descripcion" maxlength="320" placeholder="¿Qué se encuentra aquí o cómo llegar?" data-cp-desc></textarea></label>` +
      `<input name="foto" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden data-cp-input-foto>` +
      `<div class="ti-marco"><div class="ti-foto-caja" data-cp-foto-zona></div></div>` +
      `<label class="cp-campo"><span>Tu apodo (opcional)</span><input name="alias" type="text" maxlength="24" placeholder="Ej. LeonidaPro" value="${esc(leerStorage(CLAVE_ALIAS))}" data-cp-alias></label>` +
      `<p class="cp-error" data-cp-error></p>` +
      `<div class="ti-acciones">` +
        `<button type="button" class="ti-btn" data-cp-reubicar>Mover mira</button>` +
        `<button type="submit" class="ti-btn ti-btn-primario" data-cp-enviar>${tokenAdmin ? 'Publicar en vivo' : 'Enviar a revisión'}</button>` +
      `</div>` +
    `</form>`;

  const inputFoto = modal.querySelector('[data-cp-input-foto]');
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-cp-cerrar]')) return cerrarModal();
    if (e.target.closest('[data-cp-reubicar]')) { cerrarModal(); return abrirModoMira(); }
    if (e.target.closest('[data-cp-elegir-foto]')) return inputFoto?.click();
    if (e.target.closest('[data-cp-quitar-foto]')) { liberarFoto(); return pintarZonaFoto(); }
    const btnIc = e.target.closest('[data-cp-icono]');
    if (btnIc) { iconoElegido = btnIc.dataset.cpIcono; sincronizarGaleria(); }
  });
  modal.querySelector('[data-cp-cat]')?.addEventListener('change', (e) => {
    const cat = mapaCats.get(e.target.value) || mapaCats.get('otro');
    iconoElegido = cat.icono || 'icono-comunidad-otro';
    colorElegido = cat.color || '#ff2a85';
    sincronizarGaleria();
  });
  inputFoto?.addEventListener('change', () => {
    const f = inputFoto.files?.[0]; inputFoto.value = '';
    if (f) seleccionarFotoArchivo(f);
  });
  modal.querySelector('form')?.addEventListener('submit', (e) => enviarFormulario(e, coords));

  listenerEsc = (e) => { if (e.key === 'Escape') cerrarModal(); };
  window.addEventListener('keydown', listenerEsc);

  document.body.appendChild(modal);
  pintarZonaFoto();
  sincronizarGaleria();
  requestAnimationFrame(() => modal?.classList.add('ti-abierto'));
}

export function abrirCreadorPuntos(contexto) {
  ctxRef = contexto;
  if (modal || capaMira) return;
  abrirModoMira();
}
