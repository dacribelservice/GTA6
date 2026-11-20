/**
 * 🏢 EDIFICIO PRINCIPAL — MOTOR DEL MAPA HD A 60 FPS (visor-mapa.js <= 200 líneas)
 * Renderiza mapa base 4K + teselas HD (z=13..16), arrastre/zoom en requestAnimationFrame,
 * --escala-mapa aislada en #lienzo-mapa y evento edificio:vista-cambiada para Viewport Culling.
 */
const TAMANO_BASE = 1536, ZOOM_MIN = 0.42, ZOOM_MAX = 16.0;
const URL_TESELAS = 'https://tiles.mapgenie.io/games/grand-theft-auto-6/leonida/day-v2';

export const REGIONES_LEONIDA = [
  { id: 'mount-kalaga', nombre: 'Mount Kalaga National Park', x: 48.0, y: 24.5 }, { id: 'ambrosia', nombre: 'Ambrosia', x: 56.5, y: 38.0 },
  { id: 'port-gellhorn', nombre: 'Port Gellhorn', x: 38.5, y: 48.5 }, { id: 'vice-city', nombre: 'Vice City', x: 61.5, y: 55.5 },
  { id: 'grassrivers', nombre: 'Grassrivers', x: 48.5, y: 69.5 }, { id: 'leonida-keys', nombre: 'Leonida Keys', x: 44.5, y: 82.5 }
];
const estado = { tx: 0, ty: 0, escala: 1, arrastrando: false, inicioX: 0, inicioY: 0, movido: false, vista: localStorage.getItem('gta6_vista_mapa') || 'atlas' };
let elEscenario, elLienzo, elTeselas, elZoomTxt, elCoordTxt, timerTeselas, timerVista;
let rectCache = null, rafId = 0, escalaAplicada = -1, ultimaVistaMs = 0, pellizco = null;
const teselasActivas = new Map(), punteros = new Map();
const getRect = () => rectCache || (rectCache = elEscenario.getBoundingClientRect());
const cancelarRaf = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };
const aPorc = (e, r) => [
  (((e.clientX - r.left - estado.tx) / estado.escala) / TAMANO_BASE) * 100,
  (((e.clientY - r.top - estado.ty) / estado.escala) / TAMANO_BASE) * 100
];

function limpiarCapasPrevias(zActual) {
  for (const [, img] of teselasActivas) if (img.dataset.z === String(zActual) && !img.classList.contains('visible')) return;
  for (const [clave, img] of teselasActivas) if (img.dataset.z !== String(zActual)) { img.remove(); teselasActivas.delete(clave); }
}

function actualizarTeselasHD() {
  if (!elTeselas || !elEscenario) return;
  if (estado.escala < 1.32) { elTeselas.innerHTML = ''; teselasActivas.clear(); return; }
  const z = Math.min(16, Math.max(13, 12 + Math.ceil(Math.log2(estado.escala / 1.05))));
  const f = Math.pow(2, z - 12), n = 12 * f, tam = 128 / f, rect = getRect();
  const cMin = Math.max(0, Math.floor((-estado.tx / estado.escala) / tam) - 1);
  const cMax = Math.min(n - 1, Math.floor(((rect.width - estado.tx) / estado.escala) / tam) + 1);
  const rMin = Math.max(0, Math.floor((-estado.ty / estado.escala) / tam) - 1);
  const rMax = Math.min(n - 1, Math.floor(((rect.height - estado.ty) / estado.escala) / tam) + 1);
  const visibles = new Set();
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const tx = 2034 * f + c, ty = 2034 * f + r, clave = `${z}_${ty}_${tx}`;
      visibles.add(clave);
      if (teselasActivas.has(clave)) continue;
      const img = document.createElement('img');
      img.className = 'tesela-hd'; img.dataset.z = String(z); img.decoding = 'async'; img.alt = '';
      img.style.cssText = `left:${c * tam}px;top:${r * tam}px;width:${tam + 0.35}px;height:${tam + 0.35}px;z-index:${z}`;
      img.onload = () => { img.classList.add('visible'); limpiarCapasPrevias(z); };
      img.onerror = () => { teselasActivas.delete(clave); img.remove(); };
      img.src = `${URL_TESELAS}/${z}/${ty}/${tx}.jpg`;
      elTeselas.appendChild(img); teselasActivas.set(clave, img);
    }
  }
  for (const [clave, img] of teselasActivas) if (img.dataset.z === String(z) && !visibles.has(clave)) { img.remove(); teselasActivas.delete(clave); }
  limpiarCapasPrevias(z);
}

function emitirVistaCambiada() {
  if (!elEscenario) return;
  ultimaVistaMs = performance.now();
  const rect = getRect(), base = TAMANO_BASE * estado.escala;
  const x0 = (-estado.tx / base) * 100, x1 = ((rect.width - estado.tx) / base) * 100;
  const y0 = (-estado.ty / base) * 100, y1 = ((rect.height - estado.ty) / base) * 100;
  const mx = Math.max(2, (x1 - x0) * 0.12), my = Math.max(2, (y1 - y0) * 0.12);
  window.dispatchEvent(new CustomEvent('edificio:vista-cambiada', {
    detail: { xMin: Math.max(0, x0 - mx), xMax: Math.min(100, x1 + mx), yMin: Math.max(0, y0 - my), yMax: Math.min(100, y1 + my), escala: estado.escala }
  }));
}

function aplicarTransformacion(animar = false) {
  if (!elLienzo) return;
  elLienzo.style.transition = animar ? 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
  elLienzo.style.transform = `translate3d(${estado.tx.toFixed(1)}px, ${estado.ty.toFixed(1)}px, 0) scale(${estado.escala.toFixed(3)})`;
  if (estado.escala !== escalaAplicada) {
    escalaAplicada = estado.escala;
    elLienzo.style.setProperty('--escala-mapa', estado.escala.toFixed(3));
    if (elZoomTxt) elZoomTxt.textContent = `${Math.round(estado.escala * 100)}%`;
  }
  clearTimeout(timerTeselas);
  timerTeselas = setTimeout(actualizarTeselasHD, animar ? 180 : 45);
  clearTimeout(timerVista);
  if (animar || performance.now() - ultimaVistaMs >= 70) emitirVistaCambiada();
  if (!animar) timerVista = setTimeout(emitirVistaCambiada, 70);
}

function programarPintado() {
  if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; aplicarTransformacion(false); });
}

export function enfocarCoordenada(xPorc, yPorc, nuevoZoom = 2.8, animar = true) {
  if (!elEscenario) return;
  cancelarRaf();
  estado.escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevoZoom));
  const rect = getRect();
  estado.tx = rect.width / 2 - ((xPorc / 100) * TAMANO_BASE) * estado.escala;
  estado.ty = rect.height / 2 - ((yPorc / 100) * TAMANO_BASE) * estado.escala;
  aplicarTransformacion(animar);
}

export function centrarMapaInicial() {
  if (!elEscenario) return;
  cancelarRaf();
  const rect = (rectCache = elEscenario.getBoundingClientRect());
  const ideal = Math.min(rect.width / TAMANO_BASE, rect.height / TAMANO_BASE) * 1.05;
  estado.escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, ideal));
  estado.tx = (rect.width - TAMANO_BASE * estado.escala) / 2;
  estado.ty = (rect.height - TAMANO_BASE * estado.escala) / 2;
  aplicarTransformacion(true);
}

function hacerZoomEnPunto(factor, clienteX, clienteY, animar = false) {
  const rect = getRect(), cx = clienteX - rect.left, cy = clienteY - rect.top, previa = estado.escala;
  const siguiente = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, previa * factor));
  if (siguiente === previa) return;
  estado.tx = cx - ((cx - estado.tx) / previa) * siguiente;
  estado.ty = cy - ((cy - estado.ty) / previa) * siguiente;
  estado.escala = siguiente;
  if (animar) { cancelarRaf(); aplicarTransformacion(true); } else programarPintado();
}

function cambiarVista(nuevaVista) {
  estado.vista = nuevaVista;
  document.documentElement.setAttribute('data-vista', nuevaVista);
  localStorage.setItem('gta6_vista_mapa', nuevaVista);
  document.querySelectorAll('[data-btn-vista]').forEach((b) => b.classList.toggle('activo', b.dataset.btnVista === nuevaVista));
}

function montarTerrenoYControles() {
  document.getElementById('capa-terreno').innerHTML = `<img id="imagen-mapa-leonida" src="recursos/mapa/leonida-oficial.webp" alt="Mapa Oficial HD del Estado de Leonida" width="1536" height="1536" decoding="async" fetchpriority="high"><div id="capa-teselas-hd"></div><div id="capa-regiones-etiquetas"></div>`;
  elTeselas = document.getElementById('capa-teselas-hd');
  const contRegiones = document.getElementById('capa-regiones-etiquetas');
  REGIONES_LEONIDA.forEach((reg) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'etiqueta-region';
    btn.style.left = `${reg.x}%`; btn.style.top = `${reg.y}%`; btn.textContent = reg.nombre;
    btn.addEventListener('click', (e) => { e.stopPropagation(); enfocarCoordenada(reg.x, reg.y, 3.2, true); });
    contRegiones.appendChild(btn);
  });
  const nav = document.getElementById('controles-edificio');
  nav.innerHTML = `<div class="barra-edificio" role="group" aria-label="Cambiar vista de color"><button type="button" class="btn-edificio" data-btn-vista="radar">🌙 Radar</button><button type="button" class="btn-edificio" data-btn-vista="atlas">🗺️ Atlas</button><button type="button" class="btn-edificio" data-btn-vista="satelite">🛰️ Satélite</button></div><div class="barra-edificio" role="group" aria-label="Zoom HD y coordenadas"><span class="lectura-edificio" id="lectura-coords">X: 50.0% · Y: 50.0%</span><button type="button" class="btn-edificio" id="btn-zoom-out" title="Alejar">➖</button><button type="button" class="btn-edificio" id="btn-zoom-reset" title="Centrar mapa">100%</button><button type="button" class="btn-edificio" id="btn-zoom-in" title="Acercar">➕</button></div>`;
  elZoomTxt = document.getElementById('btn-zoom-reset'); elCoordTxt = document.getElementById('lectura-coords');
  nav.querySelectorAll('[data-btn-vista]').forEach((b) => b.addEventListener('click', () => cambiarVista(b.dataset.btnVista)));
  document.getElementById('btn-zoom-in').addEventListener('click', () => hacerZoomEnPunto(1.4, window.innerWidth / 2, window.innerHeight / 2, true));
  document.getElementById('btn-zoom-out').addEventListener('click', () => hacerZoomEnPunto(0.72, window.innerWidth / 2, window.innerHeight / 2, true));
  elZoomTxt.addEventListener('click', centrarMapaInicial); cambiarVista(estado.vista);
}

function iniciarPellizco() {
  const [p1, p2] = [...punteros.values()];
  pellizco = {
    dist: Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY) || 1,
    mx: (p1.clientX + p2.clientX) / 2, my: (p1.clientY + p2.clientY) / 2,
    escala: estado.escala, tx: estado.tx, ty: estado.ty
  };
  estado.movido = true;
}

function registrarEventosInteraccion() {
  elEscenario.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    punteros.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    try { elEscenario.setPointerCapture(e.pointerId); } catch {}
    estado.arrastrando = true;
    elEscenario.classList.add('arrastrando');
    if (punteros.size === 1) {
      estado.movido = false; pellizco = null;
      estado.inicioX = e.clientX - estado.tx; estado.inicioY = e.clientY - estado.ty;
    } else if (punteros.size === 2) {
      iniciarPellizco();
    }
  });
  elEscenario.addEventListener('pointermove', (e) => {
    const [xP, yP] = aPorc(e, getRect());
    if (elCoordTxt) elCoordTxt.textContent = `X: ${Math.min(100, Math.max(0, xP)).toFixed(1)}% · Y: ${Math.min(100, Math.max(0, yP)).toFixed(1)}%`;
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (punteros.size >= 2 && pellizco) {
      const [p1, p2] = [...punteros.values()];
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY) || 1;
      const mx = (p1.clientX + p2.clientX) / 2, my = (p1.clientY + p2.clientY) / 2;
      const rect = getRect();
      const nuevaEscala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pellizco.escala * (dist / pellizco.dist)));
      estado.tx = (mx - rect.left) - ((pellizco.mx - rect.left - pellizco.tx) / pellizco.escala) * nuevaEscala;
      estado.ty = (my - rect.top) - ((pellizco.my - rect.top - pellizco.ty) / pellizco.escala) * nuevaEscala;
      estado.escala = nuevaEscala;
      programarPintado();
    } else if (punteros.size === 1 && estado.arrastrando) {
      const nx = e.clientX - estado.inicioX, ny = e.clientY - estado.inicioY;
      if (Math.hypot(nx - estado.tx, ny - estado.ty) > 4) estado.movido = true;
      estado.tx = nx; estado.ty = ny; programarPintado();
    }
  });
  const fin = (e) => {
    if (!punteros.has(e.pointerId)) return;
    punteros.delete(e.pointerId);
    if (punteros.size === 1) {
      pellizco = null; estado.movido = true;
      const [restante] = punteros.values();
      estado.inicioX = restante.clientX - estado.tx;
      estado.inicioY = restante.clientY - estado.ty;
      return;
    }
    if (punteros.size >= 2) { iniciarPellizco(); return; }
    pellizco = null;
    if (!estado.arrastrando) return;
    estado.arrastrando = false; elEscenario.classList.remove('arrastrando');
    if (!estado.movido && e.type === 'pointerup') {
      const [x, y] = aPorc(e, getRect());
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        window.dispatchEvent(new CustomEvent('edificio:click-mapa', { detail: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } }));
      }
    }
  };
  elEscenario.addEventListener('pointerup', fin);
  elEscenario.addEventListener('pointercancel', fin);
  elEscenario.addEventListener('lostpointercapture', fin);
  elEscenario.addEventListener('dblclick', (e) => hacerZoomEnPunto(1.85, e.clientX, e.clientY, true));
  elEscenario.addEventListener('wheel', (e) => { e.preventDefault(); hacerZoomEnPunto(e.deltaY < 0 ? 1.18 : 0.85, e.clientX, e.clientY, false); }, { passive: false });
}

function actualizarViewport() {
  if (!elEscenario) return;
  rectCache = elEscenario.getBoundingClientRect();
  emitirVistaCambiada();
  actualizarTeselasHD();
}

export function leerEnlaceCompartido() {
  const idPunto = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('punto');
  if (idPunto) window.dispatchEvent(new CustomEvent('edificio:punto-solicitado', { detail: { id: idPunto } }));
}

export function iniciarVisorMapa() {
  elEscenario = document.getElementById('escenario-mapa'); elLienzo = document.getElementById('lienzo-mapa');
  if (!elEscenario || !elLienzo) return;
  montarTerrenoYControles(); registrarEventosInteraccion(); centrarMapaInicial();
  window.addEventListener('resize', actualizarViewport);
  window.addEventListener('hashchange', leerEnlaceCompartido);
  window.addEventListener('edificio:solicitar-vista', emitirVistaCambiada);
  setTimeout(leerEnlaceCompartido, 120);
}