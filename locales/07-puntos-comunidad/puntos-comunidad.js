/**
 * 🌐 PUNTOS DE LA COMUNIDAD — CAPA INDEPENDIENTE EN #capa-pines (puntos-comunidad.js)
 * Carga puntos aprobados en 1 RPC diferido tras el pintado inicial (0 impacto LCP/FCP),
 * apagados por defecto y 100% separados de los 2.532 marcadores oficiales.
 * Se auto-activa al abrir un enlace directo #punto=com_... y sincroniza 1:1 con el mapa.
 */

import {
  esc, obtenerSesionComunidad, llamarRpcComunidad, mostrarAvisoComunidad
} from './comunidad-api.js';
import { renderizarVerificacionEnTarjeta } from './verificacion-social.js';

const RUTA_SPRITE = 'recursos/iconos/lamina-iconos.svg';
const vista = { xMin: 0, xMax: 100, yMin: 0, yMax: 100, tx: 0, ty: 0, escala: 1, tamanoBase: 1536 };
const filtro = { q: '', reg: 'todas' };
const mapaPuntos = new Map(), mapaCatNombres = new Map(), nodosCache = new Map(), montados = new Set();

let puntos = [], capaPines = null, ctxRef = null, activo = false, cargado = false, cargando = false;
let idSeleccionado = null, idPendienteHash = null, pinZoomAplicado = '', iniciado = false;
let fabProponer = null, datosCatCache = null;

export const obtenerVistaComunidad = () => ({ ...vista });
export const obtenerCategoriasComunidad = () => datosCatCache;

async function asegurarSpriteSVG() {
  if (document.getElementById('sprite-iconos-ign')) return;
  try {
    const res = await fetch(RUTA_SPRITE);
    if (!res.ok || document.getElementById('sprite-iconos-ign')) return;
    const div = document.createElement('div');
    div.id = 'sprite-iconos-ign'; div.hidden = true; div.innerHTML = await res.text();
    document.body.appendChild(div);
  } catch {}
}

function normalizarPunto(p) {
  return {
    id: String(p.id),
    titulo: String(p.titulo || 'Punto comunitario'),
    descripcion: String(p.descripcion || ''),
    categoria: String(p.categoria_id || 'otro'),
    categoria_id: String(p.categoria_id || 'otro'),
    icono_id: String(p.icono_id || 'icono-comunidad-otro'),
    color: String(p.color || '#ff2a85'),
    region: String(p.region || 'Leonida'),
    x: Number(p.x) || 50,
    y: Number(p.y) || 50,
    autor_alias: String(p.autor_alias || 'Anónimo'),
    verificado_admin: Boolean(p.verificado_admin),
    corazones_count: Number(p.corazones_count) || 0,
    reportes_count: Number(p.reportes_count) || 0,
    mi_voto: p.mi_voto || null,
    creado_en: p.creado_en || null,
    esComunidad: true
  };
}

function crearBotonPunto(p) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `marcador-comunidad${p.verificado_admin ? ' verificado' : ''}`;
  btn.style.setProperty('--color-icono', p.color);
  Object.assign(btn.dataset, { id: p.id, categoria: p.categoria_id, region: p.region, titulo: p.titulo });
  btn.setAttribute('aria-label', `${p.titulo} — Comunidad (${p.region})`);
  btn.innerHTML = `<svg class="marcador-svg" viewBox="0 0 24 24" aria-hidden="true"><use href="#${esc(p.icono_id)}"></use></svg>`;
  return btn;
}

function posicionarBoton(btn, p, base) {
  const px = vista.tx + (p.x / 100) * base;
  const py = vista.ty + (p.y / 100) * base;
  btn.style.setProperty('--px', `${px.toFixed(1)}px`);
  btn.style.setProperty('--py', `${py.toFixed(1)}px`);
}

const enVentana = (p) => p.x >= vista.xMin && p.x <= vista.xMax && p.y >= vista.yMin && p.y <= vista.yMax;

function cumpleFiltro(p) {
  if (filtro.reg !== 'todas' && p.region !== filtro.reg) return false;
  if (!filtro.q) return true;
  const nomCat = (mapaCatNombres.get(p.categoria_id) || p.categoria_id || '').toLowerCase();
  return p.titulo.toLowerCase().includes(filtro.q)
    || p.descripcion.toLowerCase().includes(filtro.q)
    || p.region.toLowerCase().includes(filtro.q)
    || p.autor_alias.toLowerCase().includes(filtro.q)
    || nomCat.includes(filtro.q);
}

function emitirEstado() {
  let visibles = 0;
  if (activo) for (const p of puntos) if (cumpleFiltro(p)) visibles++;
  ctxRef?.emitir('comunidad:datos-listos', { puntos, total: puntos.length, visibles, activo, cargado, cargando });
}

function sincronizarVisibles() {
  if (!capaPines) return;
  if (!activo) {
    for (const id of montados) nodosCache.get(id)?.remove();
    montados.clear();
    return;
  }
  const pinZoom = vista.escala < 0.75 ? Math.max(0.65, vista.escala / 0.75).toFixed(3) : '1';
  if (pinZoom !== pinZoomAplicado) { pinZoomAplicado = pinZoom; capaPines.style.setProperty('--pin-zoom', pinZoom); }
  const base = vista.tamanoBase * vista.escala;
  const visiblesAhora = new Set(), frag = document.createDocumentFragment();
  for (const p of puntos) {
    if (!cumpleFiltro(p) || (!enVentana(p) && p.id !== idSeleccionado)) continue;
    visiblesAhora.add(p.id);
    let btn = nodosCache.get(p.id);
    if (!btn) { btn = crearBotonPunto(p); nodosCache.set(p.id, btn); }
    posicionarBoton(btn, p, base);
    if (montados.has(p.id)) continue;
    btn.classList.toggle('seleccionado', p.id === idSeleccionado);
    frag.appendChild(btn); montados.add(p.id);
  }
  for (const id of montados) {
    if (visiblesAhora.has(id)) continue;
    nodosCache.get(id)?.remove(); montados.delete(id);
  }
  if (frag.childNodes.length) capaPines.appendChild(frag);
}

function limpiarSeleccion(resincronizar = false) {
  if (!idSeleccionado) return;
  nodosCache.get(idSeleccionado)?.classList.remove('seleccionado');
  idSeleccionado = null;
  if (resincronizar) sincronizarVisibles();
}

function seleccionarPunto(id, enfocar = false) {
  const p = mapaPuntos.get(id);
  if (!p) return;
  if (!activo) { activo = true; emitirEstado(); }
  limpiarSeleccion(false);
  idSeleccionado = id;
  if (enfocar && typeof ctxRef?.enfocarCoordenada === 'function') {
    ctxRef.enfocarCoordenada(p.x, p.y, 4.5, true);
  }
  sincronizarVisibles();
  const btn = nodosCache.get(id);
  if (btn) {
    btn.classList.add('seleccionado');
    if (enfocar) {
      btn.classList.remove('resaltado'); void btn.offsetWidth; btn.classList.add('resaltado');
      setTimeout(() => btn.classList.remove('resaltado'), 1900);
    }
  }
  const nombreCat = p.categoria_id === 'otro'
    ? 'Comunidad · Otro'
    : (mapaCatNombres.get(p.categoria_id) || p.categoria_id);
  ctxRef?.emitir('iconos:seleccionado', {
    ubicacion: { ...p, descripcion: p.descripcion || 'Punto aportado por la comunidad en Leonida.' },
    categoria: { id: p.categoria_id, nombre: nombreCat, icono: p.icono_id, color: p.color }
  });
}

function actualizarContadoresPunto(id, datos) {
  const p = mapaPuntos.get(id);
  if (!p || !datos) return;
  p.corazones_count = datos.corazones_count;
  p.reportes_count = datos.reportes_count;
  p.mi_voto = datos.mi_voto;
}

function retirarPuntoOcultado(id) {
  if (!mapaPuntos.has(id)) return;
  mapaPuntos.delete(id);
  puntos = puntos.filter((p) => p.id !== id);
  nodosCache.get(id)?.remove();
  nodosCache.delete(id);
  montados.delete(id);
  if (idSeleccionado === id) idSeleccionado = null;
  sincronizarVisibles();
  emitirEstado();
}

function inyectarMetaComunidadEnTarjeta(det) {
  const u = det?.ubicacion, panel = det?.panel;
  if (!u?.esComunidad || !panel) return;
  const vivo = mapaPuntos.get(u.id) || u;
  renderizarVerificacionEnTarjeta(panel, vivo, {
    onActualizado: actualizarContadoresPunto,
    onOcultado: retirarPuntoOcultado
  });
}

export async function cargarPuntosComunidad(forzar = false) {
  if (cargando || (cargado && !forzar)) return puntos;
  cargando = true; emitirEstado();
  try {
    await asegurarSpriteSVG();
    const dato = await llamarRpcComunidad('obtener_puntos_comunidad', { p_sesion_hash: obtenerSesionComunidad() });
    const lista = Array.isArray(dato?.items) ? dato.items.map(normalizarPunto) : [];
    puntos = lista;
    mapaPuntos.clear();
    for (const id of montados) nodosCache.get(id)?.remove();
    montados.clear(); nodosCache.clear();
    for (const p of puntos) mapaPuntos.set(p.id, p);
    cargado = true;
  } catch (err) {
    console.warn('[Puntos de la Comunidad] No se pudieron cargar los aportes:', err.message);
  } finally {
    cargando = false;
    sincronizarVisibles();
    emitirEstado();
    if (idPendienteHash && mapaPuntos.has(idPendienteHash)) {
      const idObj = idPendienteHash; idPendienteHash = null;
      seleccionarPunto(idObj, true);
    }
  }
  return puntos;
}

function programarCargaDiferida() {
  const idHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('punto');
  if (idHash && idHash.startsWith('com_')) {
    idPendienteHash = idHash;
    cargarPuntosComunidad(false);
    return;
  }
  const iniciar = () => cargarPuntosComunidad(false);
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(iniciar, { timeout: 1400 });
  else window.setTimeout(iniciar, 450);
}

function cargarCssCreador() {
  if (document.querySelector('link[data-local-css="creadorPuntos"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './locales/07-puntos-comunidad/creador-puntos.css';
  link.dataset.localCss = 'creadorPuntos';
  document.head.appendChild(link);
}

function montarBotonFlotante() {
  if (fabProponer) return;
  fabProponer = document.createElement('button');
  fabProponer.type = 'button';
  fabProponer.id = 'pc-fab-proponer';
  fabProponer.className = 'pc-fab';
  fabProponer.setAttribute('aria-label', 'Proponer un punto comunitario en el mapa');
  fabProponer.innerHTML = '<span class="pc-fab-mas" aria-hidden="true">+</span><span>Proponer punto</span>';
  fabProponer.addEventListener('click', () => ctxRef?.emitir('comunidad:proponer-punto', {}));
  document.body.appendChild(fabProponer);
}

export async function iniciarPuntosComunidad(contexto) {
  if (iniciado) return;
  capaPines = document.getElementById('capa-pines');
  if (!capaPines) return;
  iniciado = true; ctxRef = contexto;
  montarBotonFlotante();

  capaPines.addEventListener('pointerdown', (e) => { if (e.target.closest('.marcador-comunidad')) e.stopPropagation(); });
  capaPines.addEventListener('click', (e) => {
    const btn = e.target.closest('.marcador-comunidad');
    if (!btn) return;
    e.stopPropagation();
    seleccionarPunto(btn.dataset.id, false);
  });

  contexto.escuchar('iconos:datos-listos', (det) => {
    if (det?.categorias) datosCatCache = det.categorias;
    for (const g of det?.categorias?.grupos || []) {
      for (const c of g.categorias || []) mapaCatNombres.set(c.id, c.nombre);
    }
  });
  contexto.emitir('iconos:solicitar-datos');

  contexto.escuchar('edificio:vista-cambiada', (v) => {
    if (!v) return;
    vista.xMin = v.xMin; vista.xMax = v.xMax; vista.yMin = v.yMin; vista.yMax = v.yMax;
    if (typeof v.tx === 'number') vista.tx = v.tx;
    if (typeof v.ty === 'number') vista.ty = v.ty;
    if (typeof v.escala === 'number') vista.escala = v.escala;
    if (typeof v.tamanoBase === 'number') vista.tamanoBase = v.tamanoBase;
    sincronizarVisibles();
  });

  contexto.escuchar('filtros:cambiar', ({ texto = '', region = 'todas' } = {}) => {
    filtro.q = String(texto || '').trim().toLowerCase();
    filtro.reg = String(region || 'todas');
    sincronizarVisibles();
    emitirEstado();
  });

  contexto.escuchar('comunidad:alternar', (det) => {
    activo = typeof det?.activo === 'boolean' ? det.activo : !activo;
    if (activo && !cargado && !cargando) cargarPuntosComunidad(false);
    sincronizarVisibles();
    emitirEstado();
  });

  contexto.escuchar('comunidad:solicitar-datos', () => emitirEstado());
  contexto.escuchar('comunidad:recargar', () => cargarPuntosComunidad(true));

  contexto.escuchar('edificio:punto-solicitado', (det) => {
    const id = det?.id;
    if (!id || !String(id).startsWith('com_')) return;
    if (mapaPuntos.has(id)) seleccionarPunto(id, true);
    else { idPendienteHash = id; cargarPuntosComunidad(true); }
  });

  contexto.escuchar('iconos:seleccionado', (det) => {
    if (!det?.ubicacion?.esComunidad) limpiarSeleccion(false);
  });
  contexto.escuchar('tarjeta:abierta', inyectarMetaComunidadEnTarjeta);
  contexto.escuchar('tarjeta:cerrada', () => limpiarSeleccion(false));

  contexto.escuchar('comunidad:proponer-punto', () => {
    cargarCssCreador();
    import('./creador-puntos.js')
      .then((m) => m.abrirCreadorPuntos?.(contexto))
      .catch(() => mostrarAvisoComunidad('No se pudo cargar el creador de puntos.'));
  });

  contexto.emitir('edificio:solicitar-vista');
  emitirEstado();
  programarCargaDiferida();
}
