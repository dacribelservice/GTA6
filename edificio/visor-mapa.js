/**
 * 🏢 EDIFICIO PRINCIPAL — MOTOR DEL MAPA HD RETINA A 60 FPS (visor-mapa.js)
 * Renderiza mapa base 3072px + teselas HD (z=13..16) sobre <canvas> 2D a resolución nativa
 * (width * devicePixelRatio) con caché LRU en memoria, multi-toque (pinch-to-zoom) y
 * sincronización exacta 1:1 de etiquetas e iconos dentro del mismo requestAnimationFrame.
 */
const TAMANO_BASE = 1536, ZOOM_MIN = 0.42, ZOOM_MAX = 12.0, MAX_CACHE = 220;
const URL_TESELAS = 'https://tiles.mapgenie.io/games/grand-theft-auto-6/leonida/day-v2';

export const REGIONES_LEONIDA = [
  { id: 'mount-kalaga', nombre: 'Mount Kalaga National Park', x: 48.0, y: 24.5 }, { id: 'ambrosia', nombre: 'Ambrosia', x: 56.5, y: 38.0 },
  { id: 'port-gellhorn', nombre: 'Port Gellhorn', x: 38.5, y: 48.5 }, { id: 'vice-city', nombre: 'Vice City', x: 61.5, y: 55.5 },
  { id: 'grassrivers', nombre: 'Grassrivers', x: 48.5, y: 69.5 }, { id: 'leonida-keys', nombre: 'Leonida Keys', x: 44.5, y: 82.5 }
];

const estado = { tx: 0, ty: 0, escala: 1, arrastrando: false, inicioX: 0, inicioY: 0, movido: false, vista: localStorage.getItem('gta6_vista_mapa') || 'atlas' };
let elEscenario, elCanvas, ctxCanvas, elZoomTxt, elCoordTxt, timerTeselas;
let rectCache = null, rafId = 0, animId = 0, escalaAplicada = -1, dprCanvas = 1, ultimoPedidoMs = 0, pellizco = null;
const cacheTeselas = new Map(), punteros = new Map(), etiquetasRegiones = [], imgBase = new Image();

const getRect = () => rectCache || (rectCache = elEscenario.getBoundingClientRect());
const cancelarAnim = () => { if (animId) { cancelAnimationFrame(animId); animId = 0; } };
const cancelarRaf = () => { cancelarAnim(); if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };
const aPorc = (e, r) => [
  (((e.clientX - r.left - estado.tx) / estado.escala) / TAMANO_BASE) * 100,
  (((e.clientY - r.top - estado.ty) / estado.escala) / TAMANO_BASE) * 100
];

function redimensionarCanvas() {
  if (!elCanvas || !elEscenario) return;
  const rect = (rectCache = elEscenario.getBoundingClientRect());
  dprCanvas = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(1, Math.round(rect.width * dprCanvas));
  const h = Math.max(1, Math.round(rect.height * dprCanvas));
  if (elCanvas.width !== w || elCanvas.height !== h) { elCanvas.width = w; elCanvas.height = h; }
}

function calcularNivelZ() {
  const factor = estado.escala * Math.min(window.devicePixelRatio || 1, 2);
  if (factor <= 1.85) return 0;
  return Math.min(16, Math.max(13, 12 + Math.ceil(Math.log2(factor / 1.85))));
}

function rangoVisible(z) {
  const f = Math.pow(2, z - 12), n = 12 * f, tam = 128 / f, rect = getRect();
  return {
    f, tam,
    cMin: Math.max(0, Math.floor((-estado.tx / estado.escala) / tam)),
    cMax: Math.min(n - 1, Math.floor(((rect.width - estado.tx) / estado.escala) / tam)),
    rMin: Math.max(0, Math.floor((-estado.ty / estado.escala) / tam)),
    rMax: Math.min(n - 1, Math.floor(((rect.height - estado.ty) / estado.escala) / tam))
  };
}

function obtenerTesela(z, c, r, f, cargar = false) {
  const clave = `${z}_${r}_${c}`;
  const existente = cacheTeselas.get(clave);
  if (existente) {
    cacheTeselas.delete(clave); cacheTeselas.set(clave, existente);
    return existente;
  }
  if (!cargar) return null;
  while (cacheTeselas.size >= MAX_CACHE) cacheTeselas.delete(cacheTeselas.keys().next().value);
  const img = new Image();
  img.decoding = 'async';
  const entry = { img, lista: false };
  img.onload = () => { entry.lista = true; programarPintado(); };
  img.onerror = () => { cacheTeselas.delete(clave); };
  img.src = `${URL_TESELAS}/${z}/${2034 * f + r}/${2034 * f + c}.jpg`;
  cacheTeselas.set(clave, entry);
  return entry;
}

function dibujarBloque(img, x, y, tamPx) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  ctxCanvas.drawImage(img, x0, y0, Math.ceil(x + tamPx) - x0, Math.ceil(y + tamPx) - y0);
}

function dibujarTerreno() {
  if (!ctxCanvas || !elEscenario) return;
  const rect = getRect();
  ctxCanvas.setTransform(dprCanvas, 0, 0, dprCanvas, 0, 0);
  ctxCanvas.clearRect(0, 0, rect.width, rect.height);
  ctxCanvas.imageSmoothingEnabled = true;
  ctxCanvas.imageSmoothingQuality = 'high';
  const baseTam = TAMANO_BASE * estado.escala;
  if (imgBase.complete && imgBase.naturalWidth) ctxCanvas.drawImage(imgBase, estado.tx, estado.ty, baseTam, baseTam);
  const z = calcularNivelZ();
  if (!z) return;
  const { f, tam, cMin, cMax, rMin, rMax } = rangoVisible(z), tamPx = tam * estado.escala;
  if (z > 13) {
    const fp = f / 2, tamP = tamPx * 2, vistos = new Set();
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const pc = c >> 1, pr = r >> 1, pk = `${pr}_${pc}`;
        if (vistos.has(pk)) continue;
        vistos.add(pk);
        const pad = obtenerTesela(z - 1, pc, pr, fp, false);
        if (pad?.lista) dibujarBloque(pad.img, estado.tx + pc * tamP, estado.ty + pr * tamP, tamP);
      }
    }
  }
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const t = obtenerTesela(z, c, r, f, false);
      if (t?.lista) dibujarBloque(t.img, estado.tx + c * tamPx, estado.ty + r * tamPx, tamPx);
    }
  }
}

function solicitarTeselasHD() {
  ultimoPedidoMs = performance.now();
  const z = calcularNivelZ();
  if (!z) return;
  const { f, cMin, cMax, rMin, rMax } = rangoVisible(z);
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) obtenerTesela(z, c, r, f, true);
  }
}

function programarTeselas() {
  clearTimeout(timerTeselas);
  if (!animId && !pellizco && performance.now() - ultimoPedidoMs >= 140) {
    solicitarTeselasHD();
    return;
  }
  timerTeselas = setTimeout(solicitarTeselasHD, animId || pellizco ? 110 : 45);
}

function posicionarEtiquetasRegiones() {
  const base = TAMANO_BASE * estado.escala;
  for (const { reg, btn } of etiquetasRegiones) {
    const px = estado.tx + (reg.x / 100) * base, py = estado.ty + (reg.y / 100) * base;
    btn.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`;
  }
}

function emitirVistaCambiada() {
  if (!elEscenario) return;
  const rect = getRect(), base = TAMANO_BASE * estado.escala;
  const x0 = (-estado.tx / base) * 100, x1 = ((rect.width - estado.tx) / base) * 100;
  const y0 = (-estado.ty / base) * 100, y1 = ((rect.height - estado.ty) / base) * 100;
  const mx = Math.max(2, (x1 - x0) * 0.12), my = Math.max(2, (y1 - y0) * 0.12);
  window.dispatchEvent(new CustomEvent('edificio:vista-cambiada', {
    detail: {
      xMin: Math.max(0, x0 - mx), xMax: Math.min(100, x1 + mx),
      yMin: Math.max(0, y0 - my), yMax: Math.min(100, y1 + my),
      escala: estado.escala, tx: estado.tx, ty: estado.ty, tamanoBase: TAMANO_BASE
    }
  }));
}

function aplicarTransformacion() {
  if (!elEscenario) return;
  dibujarTerreno();
  if (estado.escala !== escalaAplicada) {
    escalaAplicada = estado.escala;
    if (elZoomTxt) elZoomTxt.textContent = `${Math.round(estado.escala * 100)}%`;
  }
  posicionarEtiquetasRegiones();
  emitirVistaCambiada();
  programarTeselas();
}

function programarPintado() {
  if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; aplicarTransformacion(); });
}

function animarHacia(txDest, tyDest, escalaDest, dur = 300) {
  cancelarRaf();
  const tx0 = estado.tx, ty0 = estado.ty, e0 = estado.escala, t0 = performance.now();
  const paso = (ahora) => {
    const p = Math.min(1, (ahora - t0) / dur), k = 1 - Math.pow(1 - p, 3);
    estado.tx = tx0 + (txDest - tx0) * k;
    estado.ty = ty0 + (tyDest - ty0) * k;
    estado.escala = e0 + (escalaDest - e0) * k;
    animId = p < 1 ? requestAnimationFrame(paso) : 0;
    aplicarTransformacion();
  };
  animId = requestAnimationFrame(paso);
}

export function enfocarCoordenada(xPorc, yPorc, nuevoZoom = 2.8, animar = true) {
  if (!elEscenario) return;
  const es = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevoZoom)), rect = getRect();
  const ntx = rect.width / 2 - ((xPorc / 100) * TAMANO_BASE) * es;
  const nty = rect.height / 2 - ((yPorc / 100) * TAMANO_BASE) * es;
  if (animar) animarHacia(ntx, nty, es, 320);
  else { cancelarRaf(); estado.escala = es; estado.tx = ntx; estado.ty = nty; aplicarTransformacion(); }
}

export function centrarMapaInicial(animar = true) {
  if (!elEscenario) return;
  const rect = (rectCache = elEscenario.getBoundingClientRect());
  const ideal = Math.min(rect.width / TAMANO_BASE, rect.height / TAMANO_BASE) * 1.05;
  const es = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, ideal));
  const ntx = (rect.width - TAMANO_BASE * es) / 2, nty = (rect.height - TAMANO_BASE * es) / 2;
  if (animar) animarHacia(ntx, nty, es, 300);
  else { cancelarRaf(); estado.escala = es; estado.tx = ntx; estado.ty = nty; aplicarTransformacion(); }
}

function hacerZoomEnPunto(factor, clienteX, clienteY, animar = false) {
  const rect = getRect(), cx = clienteX - rect.left, cy = clienteY - rect.top, previa = estado.escala;
  const siguiente = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, previa * factor));
  if (siguiente === previa) return;
  const ntx = cx - ((cx - estado.tx) / previa) * siguiente;
  const nty = cy - ((cy - estado.ty) / previa) * siguiente;
  if (animar) animarHacia(ntx, nty, siguiente, 220);
  else { cancelarAnim(); estado.tx = ntx; estado.ty = nty; estado.escala = siguiente; programarPintado(); }
}

function cambiarVista(nuevaVista) {
  estado.vista = nuevaVista;
  document.documentElement.setAttribute('data-vista', nuevaVista);
  localStorage.setItem('gta6_vista_mapa', nuevaVista);
  document.querySelectorAll('[data-btn-vista]').forEach((b) => b.classList.toggle('activo', b.dataset.btnVista === nuevaVista));
}

function montarTerrenoYControles() {
  document.getElementById('capa-terreno').innerHTML = `<canvas id="canvas-mapa" aria-label="Mapa Oficial HD del Estado de Leonida"></canvas>`;
  elCanvas = document.getElementById('canvas-mapa');
  ctxCanvas = elCanvas.getContext('2d');
  imgBase.decoding = 'async';
  imgBase.onload = () => programarPintado();
  imgBase.src = 'recursos/mapa/leonida-oficial.webp';
  redimensionarCanvas();
  const contRegiones = document.getElementById('capa-regiones-etiquetas');
  contRegiones.innerHTML = ''; etiquetasRegiones.length = 0;
  REGIONES_LEONIDA.forEach((reg) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'etiqueta-region'; btn.textContent = reg.nombre;
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => { e.stopPropagation(); enfocarCoordenada(reg.x, reg.y, 3.2, true); });
    contRegiones.appendChild(btn); etiquetasRegiones.push({ reg, btn });
  });
  const nav = document.getElementById('controles-edificio');
  nav.innerHTML = `<div class="barra-edificio" role="group" aria-label="Cambiar vista de color"><button type="button" class="btn-edificio" data-btn-vista="radar">🌙 Radar</button><button type="button" class="btn-edificio" data-btn-vista="atlas">🗺️ Atlas</button><button type="button" class="btn-edificio" data-btn-vista="satelite">🛰️ Satélite</button></div><div class="barra-edificio" role="group" aria-label="Zoom HD y coordenadas"><span class="lectura-edificio" id="lectura-coords">X: 50.0% · Y: 50.0%</span><button type="button" class="btn-edificio" id="btn-zoom-out" title="Alejar">➖</button><button type="button" class="btn-edificio" id="btn-zoom-reset" title="Centrar mapa">100%</button><button type="button" class="btn-edificio" id="btn-zoom-in" title="Acercar">➕</button></div>`;
  elZoomTxt = document.getElementById('btn-zoom-reset'); elCoordTxt = document.getElementById('lectura-coords');
  nav.querySelectorAll('[data-btn-vista]').forEach((b) => b.addEventListener('click', () => cambiarVista(b.dataset.btnVista)));
  document.getElementById('btn-zoom-in').addEventListener('click', () => hacerZoomEnPunto(1.4, window.innerWidth / 2, window.innerHeight / 2, true));
  document.getElementById('btn-zoom-out').addEventListener('click', () => hacerZoomEnPunto(0.72, window.innerWidth / 2, window.innerHeight / 2, true));
  elZoomTxt.addEventListener('click', () => centrarMapaInicial(true)); cambiarVista(estado.vista);
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
    cancelarAnim();
    punteros.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    try { elEscenario.setPointerCapture(e.pointerId); } catch {}
    estado.arrastrando = true; elEscenario.classList.add('arrastrando');
    if (punteros.size === 1) {
      estado.movido = false; pellizco = null;
      estado.inicioX = e.clientX - estado.tx; estado.inicioY = e.clientY - estado.ty;
    } else if (punteros.size === 2) iniciarPellizco();
  });
  elEscenario.addEventListener('pointermove', (e) => {
    const [xP, yP] = aPorc(e, getRect());
    if (elCoordTxt) elCoordTxt.textContent = `X: ${Math.min(100, Math.max(0, xP)).toFixed(1)}% · Y: ${Math.min(100, Math.max(0, yP)).toFixed(1)}%`;
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (punteros.size >= 2 && pellizco) {
      const [p1, p2] = [...punteros.values()];
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY) || 1;
      const mx = (p1.clientX + p2.clientX) / 2, my = (p1.clientY + p2.clientY) / 2, rect = getRect();
      const nuevaEscala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pellizco.escala * (dist / pellizco.dist)));
      estado.tx = (mx - rect.left) - ((pellizco.mx - rect.left - pellizco.tx) / pellizco.escala) * nuevaEscala;
      estado.ty = (my - rect.top) - ((pellizco.my - rect.top - pellizco.ty) / pellizco.escala) * nuevaEscala;
      estado.escala = nuevaEscala; programarPintado();
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
      estado.inicioX = restante.clientX - estado.tx; estado.inicioY = restante.clientY - estado.ty;
      return;
    }
    if (punteros.size >= 2) { iniciarPellizco(); return; }
    pellizco = null;
    if (!estado.arrastrando) return;
    estado.arrastrando = false; elEscenario.classList.remove('arrastrando');
    programarTeselas();
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
  redimensionarCanvas();
  aplicarTransformacion();
}

export function leerEnlaceCompartido() {
  const idPunto = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('punto');
  if (idPunto) window.dispatchEvent(new CustomEvent('edificio:punto-solicitado', { detail: { id: idPunto } }));
}

export function iniciarVisorMapa() {
  elEscenario = document.getElementById('escenario-mapa');
  if (!elEscenario) return;
  montarTerrenoYControles(); registrarEventosInteraccion(); centrarMapaInicial(false);
  window.addEventListener('resize', actualizarViewport);
  window.addEventListener('hashchange', leerEnlaceCompartido);
  window.addEventListener('edificio:solicitar-vista', emitirVistaCambiada);
  setTimeout(leerEnlaceCompartido, 120);
}
